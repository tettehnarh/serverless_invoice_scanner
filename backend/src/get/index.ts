import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Joi from 'joi';

import { invoiceDb } from '../shared/database';
import {
  getUserId,
  getQueryParams,
  getPathParams,
  successResponse,
  errorResponse,
  logInfo,
  logError,
} from '../shared/utils';
import {
  InvoiceStatus,
  GetInvoicesQuery,
  NotFoundError,
  ValidationError,
} from '../shared/types';

// Validation schema for query parameters
const getInvoicesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  nextToken: Joi.string().optional(),
  status: Joi.string().valid(...Object.values(InvoiceStatus)).optional(),
});

/**
 * Lambda handler for retrieving invoices
 * GET /invoices - Get user's invoices with pagination
 * GET /invoices/{id} - Get specific invoice by ID
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    logInfo('Get invoices request received', {
      httpMethod: event.httpMethod,
      path: event.path,
      pathParameters: event.pathParameters,
      queryStringParameters: event.queryStringParameters,
    });

    const userId = getUserId(event);
    const pathParams = getPathParams(event);
    const invoiceId = pathParams.id;

    // Handle specific invoice retrieval
    if (invoiceId) {
      return await getInvoiceById(invoiceId, userId);
    }

    // Handle list invoices with pagination
    return await getInvoicesList(userId, event);

  } catch (error) {
    logError('Get invoices handler error', error);
    return errorResponse(error);
  }
};

/**
 * Get a specific invoice by ID
 */
async function getInvoiceById(
  invoiceId: string, 
  userId: string
): Promise<APIGatewayProxyResult> {
  try {
    logInfo('Retrieving invoice by ID', { invoiceId, userId });

    const invoice = await invoiceDb.getInvoice(invoiceId, userId);
    
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    logInfo('Invoice retrieved successfully', { invoiceId });

    return successResponse(invoice, 'Invoice retrieved successfully');

  } catch (error) {
    logError('Failed to get invoice by ID', { error, invoiceId, userId });
    throw error;
  }
}

/**
 * Get list of user's invoices with pagination and filtering
 */
async function getInvoicesList(
  userId: string, 
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = getQueryParams(event);
    
    // Validate query parameters
    const { error, value } = getInvoicesQuerySchema.validate(queryParams);
    if (error) {
      throw new ValidationError(`Invalid query parameters: ${error.details[0].message}`);
    }

    const query: GetInvoicesQuery = value;

    logInfo('Retrieving invoices list', { userId, query });

    const result = await invoiceDb.getUserInvoices(userId, query);

    logInfo('Invoices retrieved successfully', {
      userId,
      count: result.count,
      hasNextToken: !!result.nextToken,
    });

    return successResponse(result, 'Invoices retrieved successfully');

  } catch (error) {
    logError('Failed to get invoices list', { error, userId });
    throw error;
  }
}

/**
 * Get invoice statistics for a user
 */
export const getInvoiceStats = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserId(event);

    logInfo('Retrieving invoice statistics', { userId });

    // Get invoices by status
    const [uploadedInvoices, processingInvoices, completedInvoices, failedInvoices] = 
      await Promise.all([
        invoiceDb.getUserInvoices(userId, { status: InvoiceStatus.UPLOADED, limit: 1 }),
        invoiceDb.getUserInvoices(userId, { status: InvoiceStatus.PROCESSING, limit: 1 }),
        invoiceDb.getUserInvoices(userId, { status: InvoiceStatus.COMPLETED, limit: 100 }),
        invoiceDb.getUserInvoices(userId, { status: InvoiceStatus.FAILED, limit: 1 }),
      ]);

    // Calculate total amounts from completed invoices
    const totalAmount = completedInvoices.items.reduce((sum, invoice) => {
      return sum + (invoice.extractedData?.totalAmount || 0);
    }, 0);

    const stats = {
      totalInvoices: uploadedInvoices.count + processingInvoices.count + 
                    completedInvoices.count + failedInvoices.count,
      byStatus: {
        uploaded: uploadedInvoices.count,
        processing: processingInvoices.count,
        completed: completedInvoices.count,
        failed: failedInvoices.count,
      },
      totalAmount,
      currency: 'USD', // Default currency
      lastProcessed: completedInvoices.items[0]?.updatedAt,
    };

    logInfo('Invoice statistics calculated', { userId, stats });

    return successResponse(stats, 'Invoice statistics retrieved successfully');

  } catch (error) {
    logError('Failed to get invoice statistics', error);
    return errorResponse(error);
  }
};

/**
 * Search invoices by text content
 */
export const searchInvoices = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserId(event);
    const queryParams = getQueryParams(event);
    const searchTerm = queryParams.q;

    if (!searchTerm) {
      throw new ValidationError('Search term is required');
    }

    logInfo('Searching invoices', { userId, searchTerm });

    // Get all user's completed invoices for searching
    // In production, you'd implement proper text search with ElasticSearch or similar
    const allInvoices = await invoiceDb.getUserInvoices(userId, { 
      status: InvoiceStatus.COMPLETED,
      limit: 100 
    });

    // Simple text search in extracted data
    const searchResults = allInvoices.items.filter(invoice => {
      if (!invoice.extractedData) return false;
      
      const searchableText = [
        invoice.extractedData.vendorName,
        invoice.extractedData.invoiceNumber,
        invoice.extractedData.customerName,
        ...(invoice.extractedData.lineItems?.map(item => item.description) || []),
      ].join(' ').toLowerCase();

      return searchableText.includes(searchTerm.toLowerCase());
    });

    logInfo('Invoice search completed', {
      userId,
      searchTerm,
      resultCount: searchResults.length,
    });

    return successResponse({
      items: searchResults,
      count: searchResults.length,
      searchTerm,
    }, 'Search completed successfully');

  } catch (error) {
    logError('Failed to search invoices', error);
    return errorResponse(error);
  }
};

/**
 * Health check endpoint
 */
export const healthCheck = async (): Promise<APIGatewayProxyResult> => {
  return successResponse({
    service: 'get-invoices-handler',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
};
