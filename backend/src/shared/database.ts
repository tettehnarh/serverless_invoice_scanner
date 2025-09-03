import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, ENV } from './aws-clients';
import { 
  InvoiceMetadata, 
  DynamoInvoiceItem, 
  InvoiceStatus, 
  PaginatedResponse,
  GetInvoicesQuery 
} from './types';
import { getCurrentTimestamp, logError, logInfo } from './utils';

/**
 * Database operations for invoice metadata
 */
export class InvoiceDatabase {
  private tableName = ENV.TABLE_NAME;

  /**
   * Create a new invoice record
   */
  async createInvoice(invoice: InvoiceMetadata): Promise<void> {
    const item: DynamoInvoiceItem = {
      PK: `USER#${invoice.userId}`,
      SK: `INVOICE#${invoice.id}`,
      GSI1PK: `STATUS#${invoice.status}`,
      GSI1SK: invoice.createdAt,
      ...invoice,
    };

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      }));
      
      logInfo('Invoice created successfully', { invoiceId: invoice.id });
    } catch (error) {
      logError('Failed to create invoice', error);
      throw new Error('Failed to create invoice record');
    }
  }

  /**
   * Get invoice by ID and user ID
   */
  async getInvoice(invoiceId: string, userId: string): Promise<InvoiceMetadata | null> {
    try {
      const result = await dynamoDocClient.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `INVOICE#${invoiceId}`,
        },
      }));

      if (!result.Item) {
        return null;
      }

      return this.mapDynamoItemToInvoice(result.Item as DynamoInvoiceItem);
    } catch (error) {
      logError('Failed to get invoice', error);
      throw new Error('Failed to retrieve invoice');
    }
  }

  /**
   * Update invoice status and metadata
   */
  async updateInvoice(
    invoiceId: string, 
    userId: string, 
    updates: Partial<InvoiceMetadata>
  ): Promise<void> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build update expression dynamically
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = getCurrentTimestamp();

    // Update GSI1PK if status is being updated
    if (updates.status) {
      updateExpression.push('#GSI1PK = :GSI1PK');
      expressionAttributeNames['#GSI1PK'] = 'GSI1PK';
      expressionAttributeValues[':GSI1PK'] = `STATUS#${updates.status}`;
    }

    try {
      await dynamoDocClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `INVOICE#${invoiceId}`,
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(PK)',
      }));

      logInfo('Invoice updated successfully', { invoiceId, updates });
    } catch (error) {
      logError('Failed to update invoice', error);
      throw new Error('Failed to update invoice');
    }
  }

  /**
   * Get user's invoices with pagination
   */
  async getUserInvoices(
    userId: string, 
    query: GetInvoicesQuery = {}
  ): Promise<PaginatedResponse<InvoiceMetadata>> {
    const { limit = 20, nextToken, status } = query;

    try {
      const queryParams: any = {
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
        },
        ScanIndexForward: false, // Sort by SK in descending order (newest first)
        Limit: limit,
      };

      // Add filter for status if provided
      if (status) {
        queryParams.FilterExpression = '#status = :status';
        queryParams.ExpressionAttributeNames = { '#status': 'status' };
        queryParams.ExpressionAttributeValues[':status'] = status;
      }

      // Add pagination token if provided
      if (nextToken) {
        queryParams.ExclusiveStartKey = JSON.parse(
          Buffer.from(nextToken, 'base64').toString()
        );
      }

      const result = await dynamoDocClient.send(new QueryCommand(queryParams));

      const items = (result.Items || []).map(item => 
        this.mapDynamoItemToInvoice(item as DynamoInvoiceItem)
      );

      let responseNextToken: string | undefined;
      if (result.LastEvaluatedKey) {
        responseNextToken = Buffer.from(
          JSON.stringify(result.LastEvaluatedKey)
        ).toString('base64');
      }

      return {
        items,
        nextToken: responseNextToken,
        count: items.length,
      };
    } catch (error) {
      logError('Failed to get user invoices', error);
      throw new Error('Failed to retrieve invoices');
    }
  }

  /**
   * Get invoices by status (for monitoring/admin purposes)
   */
  async getInvoicesByStatus(
    status: InvoiceStatus,
    limit: number = 50
  ): Promise<InvoiceMetadata[]> {
    try {
      const result = await dynamoDocClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StatusIndex',
        KeyConditionExpression: 'GSI1PK = :status',
        ExpressionAttributeValues: {
          ':status': `STATUS#${status}`,
        },
        ScanIndexForward: false,
        Limit: limit,
      }));

      return (result.Items || []).map(item => 
        this.mapDynamoItemToInvoice(item as DynamoInvoiceItem)
      );
    } catch (error) {
      logError('Failed to get invoices by status', error);
      throw new Error('Failed to retrieve invoices by status');
    }
  }

  /**
   * Map DynamoDB item to InvoiceMetadata
   */
  private mapDynamoItemToInvoice(item: DynamoInvoiceItem): InvoiceMetadata {
    const { PK, SK, GSI1PK, GSI1SK, ttl, ...invoice } = item;
    return invoice as InvoiceMetadata;
  }
}

// Export singleton instance
export const invoiceDb = new InvoiceDatabase();
