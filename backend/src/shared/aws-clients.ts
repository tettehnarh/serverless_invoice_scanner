import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { TextractClient } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import AWSXRay from 'aws-xray-sdk-core';

// Configure X-Ray tracing
const captureAWS = AWSXRay.captureAWS;

// DynamoDB Client
const dynamoClient = captureAWS(new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
}));

export const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// S3 Client
export const s3Client = captureAWS(new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
}));

// Textract Client
export const textractClient = captureAWS(new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
}));

// Bedrock Runtime Client
export const bedrockClient = captureAWS(new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
}));

// Environment variables
export const ENV = {
  TABLE_NAME: process.env.TABLE_NAME!,
  BUCKET_NAME: process.env.BUCKET_NAME!,
  USER_POOL_ID: process.env.USER_POOL_ID!,
  ENVIRONMENT: process.env.ENVIRONMENT || 'dev',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
};

// Validate required environment variables
const requiredEnvVars = ['TABLE_NAME', 'BUCKET_NAME', 'USER_POOL_ID'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
