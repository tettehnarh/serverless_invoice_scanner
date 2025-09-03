// Frontend types matching backend types

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
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  vendorName?: string;
  vendorAddress?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  customerName?: string;
  customerAddress?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  lineItems?: LineItem[];
  paymentTerms?: string;
  notes?: string;
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

export interface InvoiceStats {
  totalInvoices: number;
  byStatus: {
    uploaded: number;
    processing: number;
    completed: number;
    failed: number;
  };
  totalAmount: number;
  currency: string;
  lastProcessed?: string;
}

export interface SearchResponse {
  items: InvoiceMetadata[];
  count: number;
  searchTerm: string;
}

// UI specific types
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  invoiceId?: string;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoHide?: boolean;
}

export interface AppConfig {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  region: string;
  environment: string;
}

// Authentication types
export interface User {
  id: string;
  email: string;
  name?: string;
  attributes?: Record<string, any>;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}
