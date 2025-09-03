# Serverless Invoice Scanner

A comprehensive serverless application built on AWS that automatically extracts and processes data from invoice documents using AI/ML services.

## 🏗️ Architecture

The application uses a serverless architecture with the following AWS services:

- **Frontend**: React app hosted on S3 with CloudFront distribution
- **API**: API Gateway with Lambda integration
- **Authentication**: AWS Cognito for user management
- **Processing**: AWS Lambda functions for file handling and data processing
- **AI/ML**: AWS Textract for OCR and AWS Bedrock for data structuring
- **Storage**: S3 for file storage, DynamoDB for metadata
- **Infrastructure**: AWS CDK for Infrastructure as Code
- **Monitoring**: CloudWatch and X-Ray for observability

## 🚀 Features

- ✅ Upload PDF and image invoices
- ✅ Automatic text extraction using AWS Textract
- ✅ Intelligent data structuring with AI
- ✅ RESTful API for invoice management
- ✅ Secure authentication and authorization
- ✅ Real-time processing status updates
- ✅ Cost-optimized serverless architecture
- ✅ Comprehensive monitoring and logging

## 📁 Project Structure

```
serverless-invoice-scanner/
├── infrastructure/          # AWS CDK infrastructure code
├── backend/                # Lambda functions and API code
├── frontend/               # React web application
├── tests/                  # Unit and integration tests
├── docs/                   # Documentation
├── scripts/                # Deployment and utility scripts
└── .github/                # CI/CD workflows
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate permissions
- AWS CDK CLI installed globally: `npm install -g aws-cdk`
- Git for version control

### Quick Start

1. Clone the repository:
```bash
git clone git@github.com:tettehnarh/serverless_invoice_scanner.git
cd serverless-invoice-scanner
```

2. Install dependencies:
```bash
npm run install:all
```

3. Configure AWS credentials:
```bash
aws configure
```

4. Deploy to development:
```bash
./scripts/deploy.sh dev
```

5. Deploy to production:
```bash
./scripts/deploy.sh prod
```

### Local Development

```bash
# Start frontend development server
npm run dev:frontend

# Run backend tests
npm run test:backend

# Build all components
npm run build
```

## 📖 Documentation

- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Architecture Deep Dive](docs/architecture.md)
- [Cost Optimization](docs/cost-optimization.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## 🚀 Deployment

### Automated Deployment (Recommended)

The application uses GitHub Actions for CI/CD:
- Push to `main` branch → Deploy to production
- Push to `develop` branch → Deploy to development
- Pull requests → Run tests and security scans

### Manual Deployment

```bash
# Deploy to development
./scripts/deploy.sh dev

# Deploy to production
./scripts/deploy.sh prod
```

### Domain Configuration

The application is configured to use:
- Production API: `api.leslienarh.com`
- Development API: Auto-generated API Gateway URL

See [Deployment Guide](docs/deployment.md) for detailed instructions.

## 💰 Cost Optimization

- Pay-per-use serverless architecture
- Intelligent file lifecycle management
- Optimized Lambda memory allocation
- CloudFront caching for frontend assets

## 📊 Monitoring

- CloudWatch dashboards for metrics
- X-Ray tracing for performance analysis
- Structured logging for debugging
- Automated alerting for errors

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
