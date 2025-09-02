import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface InvoiceScannerStackProps extends cdk.StackProps {
  environment: string;
}

export class InvoiceScannerStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;
  public readonly apiGatewayId: string;
  public readonly lambdaFunctions: lambda.Function[];
  public readonly dynamoTableName: string;
  public readonly s3BucketName: string;

  constructor(scope: Construct, id: string, props: InvoiceScannerStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // S3 Bucket for invoice storage
    const invoiceBucket = new s3.Bucket(this, 'InvoiceBucket', {
      bucketName: `invoice-scanner-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteOldFiles',
          enabled: true,
          expiration: cdk.Duration.days(365),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    // DynamoDB Table for invoice metadata
    const invoiceTable = new dynamodb.Table(this, 'InvoiceTable', {
      tableName: `invoice-scanner-${environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.ON_DEMAND,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for querying by status
    invoiceTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `invoice-scanner-${environment}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: `invoice-scanner-client-${environment}`,
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
    });

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
      ],
      inlinePolicies: {
        InvoiceScannerPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'textract:DetectDocumentText',
                'textract:AnalyzeDocument',
                'textract:GetDocumentAnalysis',
                'textract:StartDocumentAnalysis',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['bedrock:InvokeModel'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [invoiceBucket.arnForObjects('*')],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListBucket'],
              resources: [invoiceBucket.bucketArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
              ],
              resources: [invoiceTable.tableArn, `${invoiceTable.tableArn}/index/*`],
            }),
          ],
        }),
      },
    });

    // Lambda functions
    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: invoiceTable.tableName,
        BUCKET_NAME: invoiceBucket.bucketName,
        USER_POOL_ID: userPool.userPoolId,
        ENVIRONMENT: environment,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
      tracing: lambda.Tracing.ACTIVE,
    };

    const uploadHandler = new lambda.Function(this, 'UploadHandler', {
      ...commonLambdaProps,
      functionName: `invoice-scanner-upload-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist/upload'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const processInvoice = new lambda.Function(this, 'ProcessInvoice', {
      ...commonLambdaProps,
      functionName: `invoice-scanner-process-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist/process'),
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
    });

    const extractData = new lambda.Function(this, 'ExtractData', {
      ...commonLambdaProps,
      functionName: `invoice-scanner-extract-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist/extract'),
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
    });

    const getInvoices = new lambda.Function(this, 'GetInvoices', {
      ...commonLambdaProps,
      functionName: `invoice-scanner-get-${environment}`,
      code: lambda.Code.fromAsset('../backend/dist/get'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // S3 event notification to trigger processing
    invoiceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processInvoice),
      { prefix: 'uploads/' }
    );

    // API Gateway
    const api = new apigateway.RestApi(this, 'InvoiceScannerApi', {
      restApiName: `invoice-scanner-api-${environment}`,
      description: `Invoice Scanner API - ${environment}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'CognitoAuthorizer',
    });

    // API Resources
    const invoicesResource = api.root.addResource('invoices');
    
    // POST /invoices - Upload invoice
    invoicesResource.addMethod('POST', new apigateway.LambdaIntegration(uploadHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /invoices - Get user's invoices
    invoicesResource.addMethod('GET', new apigateway.LambdaIntegration(getInvoices), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /invoices/{id} - Get specific invoice
    const invoiceResource = invoicesResource.addResource('{id}');
    invoiceResource.addMethod('GET', new apigateway.LambdaIntegration(getInvoices), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Store outputs
    this.apiUrl = api.url;
    this.userPoolId = userPool.userPoolId;
    this.userPoolClientId = userPoolClient.userPoolClientId;
    this.apiGatewayId = api.restApiId;
    this.lambdaFunctions = [uploadHandler, processInvoice, extractData, getInvoices];
    this.dynamoTableName = invoiceTable.tableName;
    this.s3BucketName = invoiceBucket.bucketName;

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: this.apiUrl });
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClientId });
    new cdk.CfnOutput(this, 'S3BucketName', { value: this.s3BucketName });
  }
}
