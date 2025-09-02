import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse, InvoiceScannerError } from './types';

/**
 * Create a standardized API Gateway response
 */
export function createResponse<T>(
  statusCode: number,
  body: ApiResponse<T>,
  headers: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): APIGatewayProxyResult {
  return createResponse(statusCode, {
    success: true,
    data,
    message,
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string | Error,
  statusCode: number = 500
): APIGatewayProxyResult {
  const errorMessage = error instanceof Error ? error.message : error;
  const code = error instanceof InvoiceScannerError ? error.statusCode : statusCode;
  
  return createResponse(code, {
    success: false,
    error: errorMessage,
  });
}

/**
 * Parse JSON body from API Gateway event
 */
export function parseBody<T>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw new Error('Request body is required');
  }
  
  try {
    return JSON.parse(event.body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Get user ID from JWT token in API Gateway event
 */
export function getUserId(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext.authorizer?.claims;
  if (!claims || !claims.sub) {
    throw new Error('User not authenticated');
  }
  return claims.sub;
}

/**
 * Get query parameters from API Gateway event
 */
export function getQueryParams(event: APIGatewayProxyEvent): Record<string, string> {
  return event.queryStringParameters || {};
}

/**
 * Get path parameters from API Gateway event
 */
export function getPathParams(event: APIGatewayProxyEvent): Record<string, string> {
  return event.pathParameters || {};
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Validate file type for invoice processing
 */
export function isValidFileType(mimeType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/tiff',
    'image/bmp',
  ];
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Validate file size (max 10MB)
 */
export function isValidFileSize(size: number): boolean {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return size > 0 && size <= maxSize;
}

/**
 * Generate S3 key for invoice file
 */
export function generateS3Key(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `uploads/${userId}/${timestamp}-${sanitizedFileName}`;
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Parse date string to ISO format
 */
export function parseDate(dateString: string): string | undefined {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Calculate confidence score
 */
export function calculateConfidence(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Sanitize text extracted from documents
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
    .trim();
}

/**
 * Log structured message for CloudWatch
 */
export function logInfo(message: string, data?: any): void {
  console.log(JSON.stringify({
    level: 'INFO',
    message,
    timestamp: getCurrentTimestamp(),
    data,
  }));
}

/**
 * Log error message for CloudWatch
 */
export function logError(message: string, error?: any): void {
  console.error(JSON.stringify({
    level: 'ERROR',
    message,
    timestamp: getCurrentTimestamp(),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  }));
}

/**
 * Log warning message for CloudWatch
 */
export function logWarning(message: string, data?: any): void {
  console.warn(JSON.stringify({
    level: 'WARNING',
    message,
    timestamp: getCurrentTimestamp(),
    data,
  }));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
