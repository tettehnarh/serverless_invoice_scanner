import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useParams } from 'react-router-dom';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Placeholder data
  const invoice = {
    id: id,
    fileName: 'invoice-001.pdf',
    status: 'COMPLETED',
    createdAt: '2023-09-01T10:00:00Z',
    extractedData: {
      invoiceNumber: 'INV-2023-001',
      invoiceDate: '2023-08-30',
      vendorName: 'Acme Corp',
      vendorAddress: '123 Business St, City, State 12345',
      customerName: 'Your Company',
      subtotal: 1000.00,
      taxAmount: 250.00,
      totalAmount: 1250.00,
      currency: 'USD',
      lineItems: [
        {
          description: 'Professional Services',
          quantity: 10,
          unitPrice: 100.00,
          totalPrice: 1000.00,
        },
      ],
      confidence: {
        overall: 0.95,
      },
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PROCESSING':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Invoice Details
        </Typography>
        <Chip
          label={invoice.status}
          color={getStatusColor(invoice.status) as any}
          className="status-chip"
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                File Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>File Name:</strong> {invoice.fileName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Uploaded:</strong> {new Date(invoice.createdAt).toLocaleString()}
              </Typography>
              {invoice.extractedData?.confidence && (
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Confidence Score:</strong> {Math.round(invoice.extractedData.confidence.overall * 100)}%
                  </Typography>
                  <Box className="confidence-bar" mt={1} bgcolor="grey.200">
                    <Box
                      bgcolor="success.main"
                      height="100%"
                      width={`${invoice.extractedData.confidence.overall * 100}%`}
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Invoice Information
              </Typography>
              {invoice.extractedData && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Invoice Number:</strong> {invoice.extractedData.invoiceNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Date:</strong> {invoice.extractedData.invoiceDate}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Vendor:</strong> {invoice.extractedData.vendorName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Total:</strong> {invoice.extractedData.currency} {invoice.extractedData.totalAmount}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {invoice.extractedData?.lineItems && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Line Items
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.extractedData.lineItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {invoice.extractedData?.currency} {item.unitPrice}
                          </TableCell>
                          <TableCell align="right">
                            {invoice.extractedData?.currency} {item.totalPrice}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default InvoiceDetail;
