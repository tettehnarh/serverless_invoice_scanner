# API Documentation

The Invoice Scanner API provides endpoints for uploading, processing, and retrieving invoice data.

## Base URL
- Development: `https://api-dev.yourdomain.com`
- Production: `https://api.yourdomain.com`

## Authentication

All API endpoints require authentication using AWS Cognito JWT tokens.

### Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

## Endpoints

### Upload Invoice

Generate a presigned URL for uploading invoice files.

**Endpoint:** `POST /invoices`

**Request Body:**
```json
{
  "fileName": "invoice-001.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/bucket/presigned-url",
    "invoiceId": "uuid-string",
    "s3Key": "uploads/user-id/timestamp-filename.pdf"
  },
  "message": "Upload URL generated successfully"
}
```

**File Upload Process:**
1. Call this endpoint to get a presigned URL
2. Upload the file directly to S3 using the presigned URL
3. Processing will start automatically via S3 event trigger

### Get Invoices

Retrieve user's invoices with pagination and filtering.

**Endpoint:** `GET /invoices`

**Query Parameters:**
- `limit` (optional): Number of items to return (1-100, default: 20)
- `nextToken` (optional): Pagination token from previous response
- `status` (optional): Filter by status (UPLOADED, PROCESSING, COMPLETED, FAILED)

**Example Request:**
```
GET /invoices?limit=10&status=COMPLETED
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "invoice-uuid",
        "userId": "user-uuid",
        "fileName": "invoice-001.pdf",
        "fileSize": 1024000,
        "mimeType": "application/pdf",
        "s3Key": "uploads/user-id/timestamp-filename.pdf",
        "status": "COMPLETED",
        "createdAt": "2023-09-01T10:00:00Z",
        "updatedAt": "2023-09-01T10:05:00Z",
        "processingStartedAt": "2023-09-01T10:01:00Z",
        "processingCompletedAt": "2023-09-01T10:05:00Z",
        "extractedData": {
          "invoiceNumber": "INV-2023-001",
          "invoiceDate": "2023-08-30",
          "vendorName": "Acme Corp",
          "totalAmount": 1250.00,
          "currency": "USD"
        }
      }
    ],
    "nextToken": "pagination-token",
    "count": 1
  }
}
```

### Get Invoice by ID

Retrieve a specific invoice by its ID.

**Endpoint:** `GET /invoices/{id}`

**Path Parameters:**
- `id`: Invoice UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "invoice-uuid",
    "userId": "user-uuid",
    "fileName": "invoice-001.pdf",
    "status": "COMPLETED",
    "extractedData": {
      "invoiceNumber": "INV-2023-001",
      "invoiceDate": "2023-08-30",
      "dueDate": "2023-09-30",
      "vendorName": "Acme Corp",
      "vendorAddress": "123 Business St, City, State 12345",
      "vendorPhone": "+1-555-0123",
      "vendorEmail": "billing@acme.com",
      "customerName": "Your Company",
      "customerAddress": "456 Client Ave, City, State 67890",
      "subtotal": 1000.00,
      "taxAmount": 250.00,
      "totalAmount": 1250.00,
      "currency": "USD",
      "lineItems": [
        {
          "description": "Professional Services",
          "quantity": 10,
          "unitPrice": 100.00,
          "totalPrice": 1000.00,
          "taxRate": 0.25
        }
      ],
      "paymentTerms": "Net 30",
      "notes": "Thank you for your business",
      "confidence": {
        "overall": 0.95,
        "fields": {
          "invoiceNumber": 0.98,
          "totalAmount": 0.92,
          "vendorName": 0.96
        }
      }
    }
  }
}
```

### Get Invoice Statistics

Get summary statistics for user's invoices.

**Endpoint:** `GET /invoices/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalInvoices": 25,
    "byStatus": {
      "uploaded": 2,
      "processing": 1,
      "completed": 20,
      "failed": 2
    },
    "totalAmount": 15750.00,
    "currency": "USD",
    "lastProcessed": "2023-09-01T10:05:00Z"
  }
}
```

### Search Invoices

Search invoices by text content.

**Endpoint:** `GET /invoices/search`

**Query Parameters:**
- `q`: Search term (required)

**Example Request:**
```
GET /invoices/search?q=Acme Corp
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "invoice-uuid",
        "fileName": "invoice-001.pdf",
        "status": "COMPLETED",
        "extractedData": {
          "vendorName": "Acme Corp",
          "totalAmount": 1250.00
        }
      }
    ],
    "count": 1,
    "searchTerm": "Acme Corp"
  }
}
```

### Health Check

Check API health status.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "invoice-scanner-api",
    "status": "healthy",
    "timestamp": "2023-09-01T10:00:00Z",
    "environment": "production"
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created (for upload URL generation)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `PROCESSING_ERROR` - Invoice processing failed
- `UPLOAD_ERROR` - File upload failed
- `AUTHENTICATION_ERROR` - Authentication failed

## Rate Limiting

API requests are rate limited to prevent abuse:
- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1693564800
```

## File Upload Specifications

### Supported File Types
- PDF documents
- Image formats: PNG, JPEG, TIFF, BMP

### File Size Limits
- Maximum file size: 10 MB
- Minimum file size: 1 KB

### Processing Time
- Small files (< 1 MB): 30-60 seconds
- Large files (> 5 MB): 2-5 minutes

## Webhooks (Future Feature)

Webhook notifications for invoice processing status updates will be available in a future release.

## SDK and Libraries

Official SDKs will be available for:
- JavaScript/Node.js
- Python
- Java
- .NET

## Support

For API support, please contact:
- Email: api-support@yourdomain.com
- Documentation: https://docs.yourdomain.com
- Status Page: https://status.yourdomain.com
