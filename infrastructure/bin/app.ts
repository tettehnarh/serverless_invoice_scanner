#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InvoiceScannerStack } from '../lib/invoice-scanner-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

// Get environment context
const environment = app.node.tryGetContext('environment') || 'dev';
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Environment configuration
const envConfig = {
  dev: {
    stackNamePrefix: 'InvoiceScanner-Dev',
    domainName: undefined, // No custom domain for dev
    certificateArn: undefined,
  },
  prod: {
    stackNamePrefix: 'InvoiceScanner-Prod',
    domainName: 'invoice-scanner.yourdomain.com', // Replace with your domain
    certificateArn: 'arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID', // Replace with your cert
  },
};

const config = envConfig[environment as keyof typeof envConfig];

if (!config) {
  throw new Error(`Unknown environment: ${environment}`);
}

// Main backend stack
const backendStack = new InvoiceScannerStack(app, `${config.stackNamePrefix}-Backend`, {
  env: { account, region },
  environment,
  description: `Invoice Scanner Backend Stack - ${environment}`,
});

// Frontend stack
const frontendStack = new FrontendStack(app, `${config.stackNamePrefix}-Frontend`, {
  env: { account, region },
  environment,
  apiUrl: backendStack.apiUrl,
  userPoolId: backendStack.userPoolId,
  userPoolClientId: backendStack.userPoolClientId,
  domainName: config.domainName,
  certificateArn: config.certificateArn,
  description: `Invoice Scanner Frontend Stack - ${environment}`,
});

// Monitoring stack
const monitoringStack = new MonitoringStack(app, `${config.stackNamePrefix}-Monitoring`, {
  env: { account, region },
  environment,
  apiGatewayId: backendStack.apiGatewayId,
  lambdaFunctions: backendStack.lambdaFunctions,
  dynamoTableName: backendStack.dynamoTableName,
  s3BucketName: backendStack.s3BucketName,
  description: `Invoice Scanner Monitoring Stack - ${environment}`,
});

// Add dependencies
frontendStack.addDependency(backendStack);
monitoringStack.addDependency(backendStack);

// Add tags to all stacks
const tags = {
  Project: 'InvoiceScanner',
  Environment: environment,
  ManagedBy: 'CDK',
};

Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});
