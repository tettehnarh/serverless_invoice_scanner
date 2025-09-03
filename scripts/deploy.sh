#!/bin/bash

# Deployment script for Invoice Scanner
# Usage: ./scripts/deploy.sh [dev|prod]

set -e

ENVIRONMENT=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Deploying Invoice Scanner to $ENVIRONMENT environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK is not installed. Please install it first: npm install -g aws-cdk"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

print_status "AWS credentials verified"

# Navigate to project root
cd "$PROJECT_ROOT"

# Install dependencies
print_status "Installing dependencies..."
npm install

print_status "Installing backend dependencies..."
cd backend && npm install && cd ..

print_status "Installing frontend dependencies..."
cd frontend && npm install && cd ..

print_status "Installing infrastructure dependencies..."
cd infrastructure && npm install && cd ..

# Run tests
print_status "Running tests..."
npm test

# Build all components
print_status "Building backend..."
cd backend && npm run build && cd ..

print_status "Building frontend..."
cd frontend && npm run build && cd ..

print_status "Building infrastructure..."
cd infrastructure && npm run build && cd ..

# Deploy infrastructure
print_status "Deploying infrastructure to $ENVIRONMENT..."
cd infrastructure

# Bootstrap CDK if needed
if [ "$ENVIRONMENT" = "prod" ]; then
    print_status "Bootstrapping CDK for production..."
    npm run bootstrap
fi

# Deploy based on environment
if [ "$ENVIRONMENT" = "dev" ]; then
    npm run deploy:dev
elif [ "$ENVIRONMENT" = "prod" ]; then
    npm run deploy:prod
else
    print_error "Invalid environment: $ENVIRONMENT. Use 'dev' or 'prod'"
    exit 1
fi

cd ..

# Get deployment outputs
print_status "Getting deployment outputs..."
STACK_PREFIX="InvoiceScanner-$(echo $ENVIRONMENT | sed 's/./\U&/')"

# Get S3 bucket name for frontend
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-Frontend" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' \
    --output text 2>/dev/null || echo "")

# Get API URL
API_URL=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-Backend" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text 2>/dev/null || echo "")

# Get CloudFront distribution domain
DISTRIBUTION_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-Frontend" \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionDomainName`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$BUCKET_NAME" ]; then
    print_status "Deploying frontend to S3..."
    
    # Create environment config for frontend
    cat > frontend/build/env.json << EOF
{
  "REACT_APP_API_URL": "$API_URL",
  "REACT_APP_USER_POOL_ID": "$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-Backend" \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text)",
  "REACT_APP_USER_POOL_CLIENT_ID": "$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-Backend" \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text)",
  "REACT_APP_REGION": "$(aws configure get region)",
  "REACT_APP_ENVIRONMENT": "$ENVIRONMENT"
}
EOF
    
    # Sync frontend to S3
    aws s3 sync frontend/build/ s3://$BUCKET_NAME --delete
    
    # Invalidate CloudFront cache
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-Frontend" \
        --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$DISTRIBUTION_ID" ]; then
        print_status "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*" > /dev/null
    fi
else
    print_warning "Could not find S3 bucket name. Frontend deployment skipped."
fi

# Run smoke tests
if [ -n "$API_URL" ]; then
    print_status "Running smoke tests..."
    
    # Test API health endpoint
    if curl -f "${API_URL}/health" > /dev/null 2>&1; then
        print_status "API health check passed"
    else
        print_warning "API health check failed"
    fi
fi

# Print deployment summary
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "  Environment: $ENVIRONMENT"
echo "  API URL: ${API_URL:-'Not available'}"
echo "  Frontend URL: https://${DISTRIBUTION_DOMAIN:-'Not available'}"
echo ""

if [ "$ENVIRONMENT" = "dev" ]; then
    echo "🔗 Quick Links:"
    echo "  Dashboard: https://${DISTRIBUTION_DOMAIN}/dashboard"
    echo "  Upload: https://${DISTRIBUTION_DOMAIN}/upload"
    echo ""
fi

print_status "Deployment script completed!"
