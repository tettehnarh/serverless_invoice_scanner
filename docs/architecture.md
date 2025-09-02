# Architecture Deep Dive

## Overview

The Serverless Invoice Scanner is built using a microservices architecture pattern with AWS serverless technologies. This document provides a detailed breakdown of the system architecture, data flow, and design decisions.

## System Architecture

### Frontend Layer
- **Technology**: React 18 with TypeScript
- **Hosting**: Amazon S3 with CloudFront distribution
- **Authentication**: AWS Cognito integration
- **State Management**: React Context API with hooks

### API Layer
- **Service**: Amazon API Gateway (REST API)
- **Authentication**: AWS Cognito User Pools
- **Authorization**: JWT tokens with custom authorizers
- **CORS**: Configured for cross-origin requests

### Processing Layer
- **Runtime**: AWS Lambda (Node.js 18)
- **Functions**:
  - `upload-handler`: Generates presigned URLs for S3 uploads
  - `process-invoice`: Triggered by S3 events, orchestrates processing
  - `extract-data`: Processes Textract results and structures data
  - `get-invoices`: Retrieves invoice data from DynamoDB

### Storage Layer
- **File Storage**: Amazon S3 with lifecycle policies
- **Database**: Amazon DynamoDB with single-table design
- **Caching**: DynamoDB DAX for read performance

### AI/ML Services
- **OCR**: AWS Textract for text and table extraction
- **Data Processing**: AWS Bedrock for intelligent data structuring
- **Document Analysis**: Custom algorithms for invoice parsing

## Data Flow

### 1. Invoice Upload Flow
```
User → Frontend → API Gateway → Upload Lambda → S3 Presigned URL → Direct S3 Upload
```

### 2. Processing Flow
```
S3 Event → Process Lambda → Textract → Extract Lambda → DynamoDB → Status Update
```

### 3. Retrieval Flow
```
User → Frontend → API Gateway → Get Lambda → DynamoDB → Response
```

## Database Design

### DynamoDB Single Table Design

**Table Name**: `invoice-scanner-table`

**Primary Key Structure**:
- Partition Key (PK): Entity type and ID
- Sort Key (SK): Entity metadata or timestamp

**Access Patterns**:
1. Get user's invoices: `PK = USER#<userId>`, `SK begins_with INVOICE#`
2. Get invoice details: `PK = INVOICE#<invoiceId>`, `SK = METADATA`
3. Get processing status: `PK = INVOICE#<invoiceId>`, `SK = STATUS`

## Security Architecture

### Authentication & Authorization
- AWS Cognito User Pools for user management
- JWT tokens for API authentication
- IAM roles with least privilege principle
- API Gateway custom authorizers

### Data Security
- S3 bucket encryption at rest (AES-256)
- DynamoDB encryption at rest
- VPC endpoints for private communication
- CloudTrail for audit logging

## Monitoring & Observability

### Logging
- CloudWatch Logs for all Lambda functions
- Structured JSON logging format
- Log retention policies (30 days for dev, 90 days for prod)

### Metrics
- Custom CloudWatch metrics for business KPIs
- Lambda performance metrics
- API Gateway metrics
- DynamoDB performance metrics

### Tracing
- AWS X-Ray for distributed tracing
- Custom trace segments for business logic
- Performance bottleneck identification

## Scalability Considerations

### Auto Scaling
- Lambda concurrent execution limits
- DynamoDB on-demand billing mode
- API Gateway throttling limits
- S3 request rate optimization

### Performance Optimization
- Lambda memory allocation tuning
- DynamoDB query optimization
- CloudFront caching strategies
- S3 transfer acceleration

## Cost Optimization

### Serverless Benefits
- Pay-per-use pricing model
- No idle resource costs
- Automatic scaling

### Optimization Strategies
- S3 Intelligent Tiering
- Lambda memory optimization
- DynamoDB capacity planning
- CloudFront caching

## Disaster Recovery

### Backup Strategy
- DynamoDB point-in-time recovery
- S3 cross-region replication
- Infrastructure as Code for quick recovery

### High Availability
- Multi-AZ deployment
- Regional failover capabilities
- Health checks and monitoring

## Development Workflow

### Branching Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `hotfix/*`: Production fixes

### CI/CD Pipeline
- GitHub Actions for automation
- Automated testing on PR
- Staged deployments (dev → staging → prod)
- Rollback capabilities
