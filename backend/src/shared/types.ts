// Common types used across Lambda functions

export interface InvoiceMetadata {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  extractedData?: ExtractedInvoiceData;
  error?: string;
}

export enum InvoiceStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ExtractedInvoiceData {
  // Basic invoice information
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  
  // Vendor information
  vendorName?: string;
  vendorAddress?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  
  // Customer information
  customerName?: string;
  customerAddress?: string;
  
  // Financial information
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  
  // Line items
  lineItems?: LineItem[];
  
  // Additional fields
  paymentTerms?: string;
  notes?: string;
  
  // Confidence scores
  confidence?: {
    overall: number;
    fields: Record<string, number>;
  };
}

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  taxRate?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadUrlRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  invoiceId: string;
  s3Key: string;
}

export interface GetInvoicesQuery {
  limit?: number;
  nextToken?: string;
  status?: InvoiceStatus;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextToken?: string;
  count: number;
}

// DynamoDB item structure
export interface DynamoInvoiceItem {
  PK: string; // USER#userId
  SK: string; // INVOICE#invoiceId
  GSI1PK?: string; // STATUS#status
  GSI1SK?: string; // createdAt
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  extractedData?: ExtractedInvoiceData;
  error?: string;
  ttl?: number; // For automatic cleanup
}

// Textract response types
export interface TextractBlock {
  BlockType: string;
  Id: string;
  Text?: string;
  Confidence?: number;
  Geometry?: any;
  Relationships?: any[];
}

export interface TextractResponse {
  Blocks: TextractBlock[];
  DocumentMetadata?: any;
  JobStatus?: string;
}

// Custom CloudWatch metrics
export interface CustomMetric {
  MetricName: string;
  Value: number;
  Unit: string;
  Dimensions?: Array<{
    Name: string;
    Value: string;
  }>;
}

// Error types
export class InvoiceScannerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'InvoiceScannerError';
  }
}

export class ValidationError extends InvoiceScannerError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends InvoiceScannerError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ProcessingError extends InvoiceScannerError {
  constructor(message: string) {
    super(message, 'PROCESSING_ERROR', 500);
  }
}
