# Cost Optimization Guide

This guide provides strategies to optimize costs for the Serverless Invoice Scanner application.

## Cost Overview

The application uses a pay-per-use serverless architecture, which means you only pay for what you consume. Main cost components include:

### Primary Cost Drivers
1. **AWS Lambda** - Function execution time and memory
2. **Amazon S3** - Storage and data transfer
3. **Amazon DynamoDB** - Read/write operations and storage
4. **AWS Textract** - Document analysis requests
5. **AWS Bedrock** - AI model inference requests
6. **Amazon CloudFront** - Data transfer and requests
7. **Amazon API Gateway** - API requests

### Estimated Monthly Costs

#### Development Environment (Low Usage)
- Lambda: $5-15
- S3: $2-5
- DynamoDB: $1-3
- Textract: $10-25
- Bedrock: $5-15
- CloudFront: $1-3
- API Gateway: $1-3
- **Total: $25-70/month**

#### Production Environment (Medium Usage - 1000 invoices/month)
- Lambda: $20-50
- S3: $10-25
- DynamoDB: $5-15
- Textract: $100-250
- Bedrock: $50-150
- CloudFront: $5-15
- API Gateway: $5-15
- **Total: $195-520/month**

## Optimization Strategies

### 1. Lambda Optimization

#### Memory Allocation
```typescript
// Optimize memory based on function requirements
const uploadHandler = new lambda.Function(this, 'UploadHandler', {
  memorySize: 256, // Minimal for simple operations
  timeout: cdk.Duration.seconds(30),
});

const processInvoice = new lambda.Function(this, 'ProcessInvoice', {
  memorySize: 1024, // Higher for Textract processing
  timeout: cdk.Duration.minutes(5),
});
```

#### Provisioned Concurrency (Production Only)
```typescript
// Only for high-traffic functions
uploadHandler.addAlias('live', {
  provisionedConcurrencyConfig: {
    provisionedConcurrentExecutions: 5,
  },
});
```

### 2. S3 Storage Optimization

#### Lifecycle Policies
```typescript
const invoiceBucket = new s3.Bucket(this, 'InvoiceBucket', {
  lifecycleRules: [
    {
      id: 'OptimizeStorage',
      enabled: true,
      transitions: [
        {
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(30),
        },
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(90),
        },
        {
          storageClass: s3.StorageClass.DEEP_ARCHIVE,
          transitionAfter: cdk.Duration.days(365),
        },
      ],
      expiration: cdk.Duration.days(2555), // 7 years retention
    },
  ],
});
```

#### Intelligent Tiering
```typescript
const invoiceBucket = new s3.Bucket(this, 'InvoiceBucket', {
  intelligentTieringConfigurations: [
    {
      id: 'EntireBucket',
      status: s3.IntelligentTieringStatus.ENABLED,
    },
  ],
});
```

### 3. DynamoDB Optimization

#### On-Demand vs Provisioned
```typescript
// Use on-demand for unpredictable workloads
const invoiceTable = new dynamodb.Table(this, 'InvoiceTable', {
  billingMode: dynamodb.BillingMode.ON_DEMAND, // Pay per request
});

// Use provisioned for predictable workloads (production)
const invoiceTable = new dynamodb.Table(this, 'InvoiceTable', {
  billingMode: dynamodb.BillingMode.PROVISIONED,
  readCapacity: 5,
  writeCapacity: 5,
});
```

#### Auto Scaling (Provisioned Mode)
```typescript
const readScaling = invoiceTable.autoScaleReadCapacity({
  minCapacity: 1,
  maxCapacity: 100,
});

readScaling.scaleOnUtilization({
  targetUtilizationPercent: 70,
});
```

### 4. Textract Cost Optimization

#### Document Preprocessing
```typescript
// Optimize image quality before sending to Textract
const optimizeImage = (buffer: Buffer): Buffer => {
  // Reduce image size while maintaining OCR quality
  // Convert to grayscale if color not needed
  // Compress to optimal DPI (300 DPI for OCR)
  return buffer;
};
```

#### Selective Feature Usage
```typescript
// Only use required Textract features
const command = new AnalyzeDocumentCommand({
  Document: { S3Object: s3Object },
  FeatureTypes: [
    FeatureType.TABLES, // Only if tables are needed
    FeatureType.FORMS,  // Only if forms are needed
  ],
});
```

### 5. Bedrock Cost Optimization

#### Model Selection
```typescript
// Use smaller, faster models for simple extraction
const modelId = environment === 'dev' 
  ? 'anthropic.claude-instant-v1' // Cheaper for development
  : 'anthropic.claude-3-sonnet-20240229-v1:0'; // Better accuracy for production
```

#### Prompt Optimization
```typescript
// Optimize prompts to reduce token usage
const createOptimizedPrompt = (text: string): string => {
  // Truncate text to essential parts only
  const truncatedText = text.substring(0, 4000);
  
  return `Extract invoice data from: ${truncatedText}
Return JSON with: invoiceNumber, date, vendor, total only.`;
};
```

### 6. CloudFront Optimization

#### Caching Strategy
```typescript
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    compress: true,
  },
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe only
});
```

### 7. Monitoring and Alerting

#### Cost Alerts
```typescript
const costAlarm = new cloudwatch.Alarm(this, 'CostAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/Billing',
    metricName: 'EstimatedCharges',
    dimensionsMap: {
      Currency: 'USD',
    },
    statistic: 'Maximum',
  }),
  threshold: 100, // Alert if monthly cost exceeds $100
  evaluationPeriods: 1,
});
```

#### Usage Monitoring
```typescript
// Monitor Lambda invocations
const invocationAlarm = new cloudwatch.Alarm(this, 'HighInvocations', {
  metric: uploadHandler.metricInvocations({
    period: cdk.Duration.hours(1),
  }),
  threshold: 1000, // Alert if > 1000 invocations per hour
  evaluationPeriods: 1,
});
```

## Environment-Specific Optimizations

### Development Environment
```typescript
const devOptimizations = {
  // Shorter retention periods
  logRetention: logs.RetentionDays.ONE_WEEK,
  
  // Smaller Lambda memory
  lambdaMemory: 256,
  
  // No provisioned concurrency
  provisionedConcurrency: 0,
  
  // Faster S3 lifecycle transitions
  s3LifecycleTransition: cdk.Duration.days(7),
};
```

### Production Environment
```typescript
const prodOptimizations = {
  // Longer retention for compliance
  logRetention: logs.RetentionDays.ONE_YEAR,
  
  // Optimized Lambda memory
  lambdaMemory: 1024,
  
  // Provisioned concurrency for critical functions
  provisionedConcurrency: 5,
  
  // Standard S3 lifecycle transitions
  s3LifecycleTransition: cdk.Duration.days(30),
};
```

## Cost Monitoring Tools

### AWS Cost Explorer
- Set up custom cost reports
- Track costs by service and tag
- Identify cost trends and anomalies

### AWS Budgets
```bash
# Create a budget alert
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "InvoiceScanner-Monthly",
    "BudgetLimit": {
      "Amount": "200",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'
```

### Custom Cost Dashboard
```typescript
const costDashboard = new cloudwatch.Dashboard(this, 'CostDashboard', {
  dashboardName: 'InvoiceScanner-Costs',
  widgets: [
    new cloudwatch.GraphWidget({
      title: 'Lambda Costs',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          statistic: 'Sum',
        }),
      ],
    }),
  ],
});
```

## Best Practices

### 1. Regular Cost Reviews
- Weekly cost analysis during development
- Monthly cost reviews for production
- Quarterly optimization assessments

### 2. Resource Tagging
```typescript
// Tag all resources for cost allocation
cdk.Tags.of(this).add('Project', 'InvoiceScanner');
cdk.Tags.of(this).add('Environment', environment);
cdk.Tags.of(this).add('CostCenter', 'Engineering');
```

### 3. Automated Cleanup
```typescript
// Automatically delete old test data
const cleanupFunction = new lambda.Function(this, 'CleanupFunction', {
  schedule: events.Schedule.rate(cdk.Duration.days(1)),
  handler: 'cleanup.handler',
});
```

### 4. Performance Optimization
- Faster functions = lower costs
- Optimize database queries
- Use appropriate data structures
- Implement caching where beneficial

## Cost Estimation Tools

### AWS Pricing Calculator
Use the [AWS Pricing Calculator](https://calculator.aws/) to estimate costs based on your expected usage.

### CDK Cost Estimation
```bash
# Estimate costs for your CDK stack
npm install -g aws-cdk-cost-estimation
cdk-cost-estimation --stack-name InvoiceScanner-Prod-Backend
```

## Emergency Cost Controls

### 1. Lambda Concurrency Limits
```typescript
// Prevent runaway costs
uploadHandler.addReservedConcurrency(100);
```

### 2. API Gateway Throttling
```typescript
const api = new apigateway.RestApi(this, 'Api', {
  deployOptions: {
    throttle: {
      rateLimit: 100,
      burstLimit: 200,
    },
  },
});
```

### 3. Automated Shutdown
```typescript
// Automatically stop expensive operations
const emergencyStopFunction = new lambda.Function(this, 'EmergencyStop', {
  // Function to disable processing if costs exceed threshold
});
```

By implementing these optimization strategies, you can significantly reduce the operational costs of your Invoice Scanner application while maintaining performance and reliability.
