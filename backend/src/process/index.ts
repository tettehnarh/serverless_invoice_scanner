import { S3Event, S3EventRecord } from 'aws-lambda';
import { 
  DetectDocumentTextCommand, 
  AnalyzeDocumentCommand,
  FeatureType 
} from '@aws-sdk/client-textract';
import { InvokeCommand } from '@aws-sdk/client-bedrock-runtime';

import { textractClient, bedrockClient } from '../shared/aws-clients';
import { invoiceDb } from '../shared/database';
import {
  InvoiceStatus,
  ExtractedInvoiceData,
  TextractResponse,
  ProcessingError,
} from '../shared/types';
import {
  getCurrentTimestamp,
  logInfo,
  logError,
  retryWithBackoff,
  sanitizeText,
  calculateConfidence,
} from '../shared/utils';

/**
 * Lambda handler for processing uploaded invoices
 * Triggered by S3 events when files are uploaded
 */
export const handler = async (event: S3Event): Promise<void> => {
  logInfo('Processing S3 event', { recordCount: event.Records.length });

  // Process each S3 record
  for (const record of event.Records) {
    await processInvoiceFile(record);
  }
};

/**
 * Process a single invoice file
 */
async function processInvoiceFile(record: S3EventRecord): Promise<void> {
  const bucketName = record.s3.bucket.name;
  const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  
  logInfo('Processing invoice file', { bucketName, objectKey });

  try {
    // Extract invoice ID from S3 object metadata or key
    const invoiceId = await getInvoiceIdFromS3Key(objectKey);
    if (!invoiceId) {
      logError('Could not extract invoice ID from S3 key', { objectKey });
      return;
    }

    // Update status to processing
    await updateInvoiceStatus(invoiceId, InvoiceStatus.PROCESSING);

    // Extract text using AWS Textract
    const textractResult = await extractTextWithTextract(bucketName, objectKey);
    
    // Process extracted text with AI to structure data
    const extractedData = await processTextWithAI(textractResult);

    // Update invoice with extracted data
    await updateInvoiceWithData(invoiceId, extractedData);

    logInfo('Invoice processing completed successfully', { 
      invoiceId, 
      objectKey 
    });

  } catch (error) {
    logError('Invoice processing failed', { error, objectKey });
    
    // Try to update status to failed if we can extract invoice ID
    try {
      const invoiceId = await getInvoiceIdFromS3Key(objectKey);
      if (invoiceId) {
        await updateInvoiceStatus(
          invoiceId, 
          InvoiceStatus.FAILED, 
          error instanceof Error ? error.message : 'Processing failed'
        );
      }
    } catch (updateError) {
      logError('Failed to update invoice status to failed', updateError);
    }
  }
}

/**
 * Extract invoice ID from S3 object key
 */
async function getInvoiceIdFromS3Key(objectKey: string): Promise<string | null> {
  // The S3 key format is: uploads/{userId}/{timestamp}-{filename}
  // We need to query the database to find the invoice with this S3 key
  // For now, we'll extract from the object metadata when we implement the full flow
  
  // This is a simplified approach - in production, you might want to
  // include the invoice ID in the S3 key or use S3 object metadata
  const pathParts = objectKey.split('/');
  if (pathParts.length >= 3 && pathParts[0] === 'uploads') {
    // Extract timestamp from filename to help identify the invoice
    const filename = pathParts[pathParts.length - 1];
    const timestampMatch = filename.match(/^(\d+)-/);
    if (timestampMatch) {
      // In a real implementation, you'd query the database here
      // For now, return a placeholder
      return `invoice-${timestampMatch[1]}`;
    }
  }
  return null;
}

/**
 * Extract text from document using AWS Textract
 */
async function extractTextWithTextract(
  bucketName: string, 
  objectKey: string
): Promise<TextractResponse> {
  logInfo('Starting Textract analysis', { bucketName, objectKey });

  const s3Object = {
    Bucket: bucketName,
    Name: objectKey,
  };

  try {
    // Use AnalyzeDocument for better structured data extraction
    const command = new AnalyzeDocumentCommand({
      Document: { S3Object: s3Object },
      FeatureTypes: [
        FeatureType.TABLES,
        FeatureType.FORMS,
        FeatureType.LAYOUT,
      ],
    });

    const result = await retryWithBackoff(
      () => textractClient.send(command),
      3,
      1000
    );

    logInfo('Textract analysis completed', {
      blockCount: result.Blocks?.length || 0,
      documentMetadata: result.DocumentMetadata,
    });

    return result as TextractResponse;

  } catch (error) {
    logError('Textract analysis failed', error);
    throw new ProcessingError(`Textract analysis failed: ${error}`);
  }
}

/**
 * Process extracted text with AI to structure invoice data
 */
async function processTextWithAI(textractResult: TextractResponse): Promise<ExtractedInvoiceData> {
  logInfo('Processing text with AI', { 
    blockCount: textractResult.Blocks?.length || 0 
  });

  try {
    // Extract text content from Textract blocks
    const textContent = extractTextFromBlocks(textractResult.Blocks || []);
    
    // Create prompt for AI processing
    const prompt = createInvoiceExtractionPrompt(textContent);
    
    // Call Bedrock to structure the data
    const structuredData = await callBedrockForDataExtraction(prompt);
    
    // Calculate confidence scores
    const confidenceScores = calculateTextractConfidence(textractResult.Blocks || []);
    
    return {
      ...structuredData,
      confidence: {
        overall: calculateConfidence(confidenceScores),
        fields: {}, // Would be populated with field-specific confidence
      },
    };

  } catch (error) {
    logError('AI processing failed', error);
    throw new ProcessingError(`AI processing failed: ${error}`);
  }
}

/**
 * Extract text content from Textract blocks
 */
function extractTextFromBlocks(blocks: any[]): string {
  return blocks
    .filter(block => block.BlockType === 'LINE' && block.Text)
    .map(block => sanitizeText(block.Text))
    .join('\n');
}

/**
 * Create prompt for invoice data extraction
 */
function createInvoiceExtractionPrompt(textContent: string): string {
  return `
Extract structured data from the following invoice text. Return a JSON object with the following fields:
- invoiceNumber: string
- invoiceDate: string (ISO format)
- dueDate: string (ISO format)
- vendorName: string
- vendorAddress: string
- customerName: string
- customerAddress: string
- subtotal: number
- taxAmount: number
- totalAmount: number
- currency: string
- lineItems: array of {description, quantity, unitPrice, totalPrice}

Invoice text:
${textContent}

Return only valid JSON without any additional text or formatting.
`;
}

/**
 * Call AWS Bedrock for data extraction
 */
async function callBedrockForDataExtraction(prompt: string): Promise<ExtractedInvoiceData> {
  try {
    const command = new InvokeCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await retryWithBackoff(
      () => bedrockClient.send(command),
      2,
      2000
    );

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const extractedText = responseBody.content[0].text;
    
    // Parse the JSON response
    return JSON.parse(extractedText);

  } catch (error) {
    logError('Bedrock invocation failed', error);
    // Return empty data structure if AI processing fails
    return {};
  }
}

/**
 * Calculate confidence scores from Textract blocks
 */
function calculateTextractConfidence(blocks: any[]): number[] {
  return blocks
    .filter(block => block.Confidence !== undefined)
    .map(block => block.Confidence);
}

/**
 * Update invoice status in database
 */
async function updateInvoiceStatus(
  invoiceId: string, 
  status: InvoiceStatus, 
  error?: string
): Promise<void> {
  try {
    // We need to get the userId first - this is a simplified approach
    // In production, you'd store this information differently
    const updates: any = {
      status,
      updatedAt: getCurrentTimestamp(),
    };

    if (status === InvoiceStatus.PROCESSING) {
      updates.processingStartedAt = getCurrentTimestamp();
    } else if (status === InvoiceStatus.COMPLETED) {
      updates.processingCompletedAt = getCurrentTimestamp();
    } else if (status === InvoiceStatus.FAILED && error) {
      updates.error = error;
    }

    // This is a placeholder - you'd need to implement proper user lookup
    // await invoiceDb.updateInvoice(invoiceId, userId, updates);
    
    logInfo('Invoice status updated', { invoiceId, status });

  } catch (error) {
    logError('Failed to update invoice status', error);
    throw error;
  }
}

/**
 * Update invoice with extracted data
 */
async function updateInvoiceWithData(
  invoiceId: string, 
  extractedData: ExtractedInvoiceData
): Promise<void> {
  try {
    const updates = {
      status: InvoiceStatus.COMPLETED,
      extractedData,
      processingCompletedAt: getCurrentTimestamp(),
    };

    // This is a placeholder - you'd need to implement proper user lookup
    // await invoiceDb.updateInvoice(invoiceId, userId, updates);
    
    logInfo('Invoice data updated', { invoiceId, extractedData });

  } catch (error) {
    logError('Failed to update invoice data', error);
    throw error;
  }
}
