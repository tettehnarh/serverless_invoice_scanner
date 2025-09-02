import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

import { s3Client, ENV } from '../shared/aws-clients';
import { invoiceDb } from '../shared/database';
import {
  parseBody,
  getUserId,
  successResponse,
  errorResponse,
  isValidFileType,
  isValidFileSize,
  generateS3Key,
  getCurrentTimestamp,
  logInfo,
  logError,
} from '../shared/utils';
import {
  UploadUrlRequest,
  UploadUrlResponse,
  InvoiceMetadata,
  InvoiceStatus,
  ValidationError,
} from '../shared/types';

// Validation schema for upload request
const uploadRequestSchema = Joi.object({
  fileName: Joi.string().min(1).max(255).required(),
  fileSize: Joi.number().integer().min(1).max(10 * 1024 * 1024).required(), // Max 10MB
  mimeType: Joi.string().required(),
});

/**
 * Lambda handler for generating presigned upload URLs
 * POST /invoices
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('Upload request received', { 
      httpMethod: event.httpMethod,
      path: event.path 
    });

    // Parse and validate request body
    const requestBody = parseBody<UploadUrlRequest>(event);
    const { error, value } = uploadRequestSchema.validate(requestBody);
    
    if (error) {
      throw new ValidationError(`Invalid request: ${error.details[0].message}`);
    }

    const { fileName, fileSize, mimeType } = value;

    // Validate file type
    if (!isValidFileType(mimeType)) {
      throw new ValidationError(
        'Invalid file type. Supported types: PDF, JPEG, PNG, TIFF, BMP'
      );
    }

    // Validate file size
    if (!isValidFileSize(fileSize)) {
      throw new ValidationError(
        'Invalid file size. Maximum size is 10MB'
      );
    }

    // Get user ID from JWT token
    const userId = getUserId(event);
    
    // Generate unique invoice ID and S3 key
    const invoiceId = uuidv4();
    const s3Key = generateS3Key(userId, fileName);

    logInfo('Generating presigned URL', {
      invoiceId,
      userId,
      fileName,
      fileSize,
      mimeType,
      s3Key,
    });

    // Create presigned URL for S3 upload
    const putObjectCommand = new PutObjectCommand({
      Bucket: ENV.BUCKET_NAME,
      Key: s3Key,
      ContentType: mimeType,
      ContentLength: fileSize,
      Metadata: {
        'invoice-id': invoiceId,
        'user-id': userId,
        'original-filename': fileName,
      },
      // Add server-side encryption
      ServerSideEncryption: 'AES256',
    });

    const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 300, // 5 minutes
    });

    // Create invoice metadata record
    const invoiceMetadata: InvoiceMetadata = {
      id: invoiceId,
      userId,
      fileName,
      fileSize,
      mimeType,
      s3Key,
      status: InvoiceStatus.UPLOADED,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    // Save to database
    await invoiceDb.createInvoice(invoiceMetadata);

    const response: UploadUrlResponse = {
      uploadUrl,
      invoiceId,
      s3Key,
    };

    logInfo('Presigned URL generated successfully', {
      invoiceId,
      userId,
      expiresIn: 300,
    });

    return successResponse(response, 'Upload URL generated successfully', 201);

  } catch (error) {
    logError('Upload handler error', error);
    return errorResponse(error);
  }
};

/**
 * Health check endpoint
 */
export const healthCheck = async (): Promise<APIGatewayProxyResult> => {
  return successResponse({
    service: 'upload-handler',
    status: 'healthy',
    timestamp: getCurrentTimestamp(),
    environment: ENV.ENVIRONMENT,
  });
};
