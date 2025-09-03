# Deployment Guide

This guide covers how to deploy the Serverless Invoice Scanner application to AWS.

## Prerequisites

### Required Tools
- **Node.js 18+** and npm
- **AWS CLI** configured with appropriate permissions
- **AWS CDK CLI** installed globally: `npm install -g aws-cdk`
- **Git** for version control

### AWS Permissions
Your AWS user/role needs the following permissions:
- CloudFormation full access
- S3 full access
- Lambda full access
- API Gateway full access
- DynamoDB full access
- Cognito full access
- IAM role creation and management
- CloudWatch and X-Ray access
- Textract and Bedrock access

## Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd serverless-invoice-scanner
npm install
```

### 2. Configure AWS
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

### 3. Deploy to Development
```bash
./scripts/deploy.sh dev
```

### 4. Deploy to Production
```bash
./scripts/deploy.sh prod
```

## Manual Deployment Steps

### 1. Install Dependencies
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Frontend dependencies
cd frontend && npm install && cd ..

# Infrastructure dependencies
cd infrastructure && npm install && cd ..
```

### 2. Build All Components
```bash
# Build backend
cd backend && npm run build && cd ..

# Build frontend
cd frontend && npm run build && cd ..

# Build infrastructure
cd infrastructure && npm run build && cd ..
```

### 3. Deploy Infrastructure
```bash
cd infrastructure

# For development
npm run deploy:dev

# For production
npm run deploy:prod
```

### 4. Deploy Frontend
After infrastructure deployment, get the S3 bucket name and deploy frontend:

```bash
# Get bucket name from CloudFormation outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name InvoiceScanner-Dev-Frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' \
  --output text)

# Sync frontend build to S3
aws s3 sync frontend/build/ s3://$BUCKET_NAME --delete

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name InvoiceScanner-Dev-Frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

## Environment Configuration

### Development Environment
- Stack prefix: `InvoiceScanner-Dev`
- No custom domain
- Relaxed security settings for testing
- Shorter data retention periods

### Production Environment
- Stack prefix: `InvoiceScanner-Prod`
- Custom domain support
- Enhanced security settings
- Longer data retention periods
- Point-in-time recovery enabled

## Custom Domain Setup (Production)

### 1. Request SSL Certificate
```bash
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

### 2. Update Infrastructure Configuration
Edit `infrastructure/bin/app.ts` and update the production configuration:

```typescript
prod: {
  stackNamePrefix: 'InvoiceScanner-Prod',
  domainName: 'api.yourdomain.com',
  certificateArn: 'arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID',
},
```

### 3. Deploy with Custom Domain
```bash
cd infrastructure && npm run deploy:prod
```

## CI/CD Pipeline

### GitHub Actions Setup

1. **Create GitHub Secrets:**
   ```
   AWS_ACCESS_KEY_ID - Development AWS access key
   AWS_SECRET_ACCESS_KEY - Development AWS secret key
   AWS_ACCESS_KEY_ID_PROD - Production AWS access key
   AWS_SECRET_ACCESS_KEY_PROD - Production AWS secret key
   SNYK_TOKEN - Snyk security scanning token (optional)
   ```

2. **Branch Strategy:**
   - `main` branch deploys to production
   - `develop` branch deploys to development
   - Pull requests trigger tests only

3. **Workflow Triggers:**
   - Push to `main` → Deploy to production
   - Push to `develop` → Deploy to development
   - Pull requests → Run tests and security scans

### Manual GitHub Actions Trigger
You can manually trigger deployments from the GitHub Actions tab in your repository.

## Monitoring and Logging

### CloudWatch Dashboards
After deployment, access monitoring dashboards:
- Development: [CloudWatch Console](https://console.aws.amazon.com/cloudwatch/home#dashboards:name=InvoiceScanner-Dev)
- Production: [CloudWatch Console](https://console.aws.amazon.com/cloudwatch/home#dashboards:name=InvoiceScanner-Prod)

### Log Groups
- Lambda functions: `/aws/lambda/invoice-scanner-*`
- API Gateway: `/aws/apigateway/invoice-scanner-api-*`

### X-Ray Tracing
View distributed traces in the [X-Ray Console](https://console.aws.amazon.com/xray/home).

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**
   ```bash
   cd infrastructure && npm run bootstrap
   ```

2. **Permission Denied Errors**
   - Verify AWS credentials: `aws sts get-caller-identity`
   - Check IAM permissions for your user/role

3. **Stack Already Exists**
   ```bash
   # Delete existing stack
   cd infrastructure && npm run destroy
   ```

4. **Frontend Not Loading**
   - Check S3 bucket policy
   - Verify CloudFront distribution status
   - Check browser console for errors

5. **API Errors**
   - Check Lambda function logs in CloudWatch
   - Verify API Gateway configuration
   - Test endpoints with curl or Postman

### Debugging Commands

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name InvoiceScanner-Dev-Backend

# View recent logs
aws logs tail /aws/lambda/invoice-scanner-upload-dev --follow

# Test API endpoint
curl -X GET https://your-api-url/health

# Check S3 bucket contents
aws s3 ls s3://your-bucket-name --recursive
```

## Rollback Procedures

### Infrastructure Rollback
```bash
cd infrastructure
aws cloudformation cancel-update-stack --stack-name InvoiceScanner-Prod-Backend
```

### Frontend Rollback
```bash
# Restore previous version from S3 versioning
aws s3api list-object-versions --bucket your-bucket-name --prefix index.html
aws s3api restore-object --bucket your-bucket-name --key index.html --version-id previous-version-id
```

## Cost Optimization

### Development Environment
- Use smaller Lambda memory allocations
- Enable S3 lifecycle policies
- Set shorter log retention periods

### Production Environment
- Monitor CloudWatch costs
- Use Reserved Capacity for DynamoDB if usage is predictable
- Enable S3 Intelligent Tiering

## Security Considerations

### Secrets Management
- Use AWS Secrets Manager for sensitive configuration
- Rotate access keys regularly
- Use IAM roles instead of access keys where possible

### Network Security
- API Gateway has built-in DDoS protection
- CloudFront provides additional security features
- Consider WAF for production environments

### Data Protection
- All data encrypted at rest and in transit
- S3 bucket access logging enabled
- CloudTrail for API auditing
