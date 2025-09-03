import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Auth } from 'aws-amplify';
import {
  ApiResponse,
  InvoiceMetadata,
  UploadUrlRequest,
  UploadUrlResponse,
  GetInvoicesQuery,
  PaginatedResponse,
  InvoiceStats,
  SearchResponse,
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Get API URL from environment config
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const session = await Auth.currentSession();
          const token = session.getIdToken().getJwtToken();
          config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
          console.warn('No valid session found');
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          Auth.signOut();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get presigned URL for file upload
   */
  async getUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResponse> {
    const response: AxiosResponse<ApiResponse<UploadUrlResponse>> = await this.api.post(
      '/invoices',
      request
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get upload URL');
    }
    
    return response.data.data!;
  }

  /**
   * Upload file to S3 using presigned URL
   */
  async uploadFile(
    uploadUrl: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  /**
   * Get user's invoices with pagination
   */
  async getInvoices(query?: GetInvoicesQuery): Promise<PaginatedResponse<InvoiceMetadata>> {
    const params = new URLSearchParams();
    
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.nextToken) params.append('nextToken', query.nextToken);
    if (query?.status) params.append('status', query.status);

    const response: AxiosResponse<ApiResponse<PaginatedResponse<InvoiceMetadata>>> = 
      await this.api.get(`/invoices?${params.toString()}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get invoices');
    }
    
    return response.data.data!;
  }

  /**
   * Get specific invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<InvoiceMetadata> {
    const response: AxiosResponse<ApiResponse<InvoiceMetadata>> = await this.api.get(
      `/invoices/${invoiceId}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get invoice');
    }
    
    return response.data.data!;
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(): Promise<InvoiceStats> {
    const response: AxiosResponse<ApiResponse<InvoiceStats>> = await this.api.get(
      '/invoices/stats'
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get invoice statistics');
    }
    
    return response.data.data!;
  }

  /**
   * Search invoices
   */
  async searchInvoices(searchTerm: string): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: searchTerm });
    
    const response: AxiosResponse<ApiResponse<SearchResponse>> = await this.api.get(
      `/invoices/search?${params.toString()}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to search invoices');
    }
    
    return response.data.data!;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    const response = await this.api.get('/health');
    return response.data;
  }

  /**
   * Complete file upload process
   */
  async uploadInvoice(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ invoiceId: string; uploadUrl: string }> {
    try {
      // Step 1: Get presigned URL
      const uploadData = await this.getUploadUrl({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      // Step 2: Upload file to S3
      await this.uploadFile(uploadData.uploadUrl, file, onProgress);

      return {
        invoiceId: uploadData.invoiceId,
        uploadUrl: uploadData.uploadUrl,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
