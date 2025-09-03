import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const InvoiceList: React.FC = () => {
  const navigate = useNavigate();

  // Placeholder data
  const invoices = [
    {
      id: '1',
      fileName: 'invoice-001.pdf',
      status: 'COMPLETED',
      createdAt: '2023-09-01T10:00:00Z',
      extractedData: {
        vendorName: 'Acme Corp',
        totalAmount: 1250.00,
        currency: 'USD',
      },
    },
    {
      id: '2',
      fileName: 'receipt-002.jpg',
      status: 'PROCESSING',
      createdAt: '2023-09-01T11:30:00Z',
    },
  ];

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
      <Typography variant="h4" component="h1" gutterBottom>
        Invoices
      </Typography>

      <Grid container spacing={3}>
        {invoices.map((invoice) => (
          <Grid item xs={12} md={6} lg={4} key={invoice.id}>
            <Card className="invoice-card">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" noWrap>
                    {invoice.fileName}
                  </Typography>
                  <Chip
                    label={invoice.status}
                    color={getStatusColor(invoice.status) as any}
                    size="small"
                    className="status-chip"
                  />
                </Box>

                {invoice.extractedData && (
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Vendor: {invoice.extractedData.vendorName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Amount: {invoice.extractedData.currency} {invoice.extractedData.totalAmount}
                    </Typography>
                  </Box>
                )}

                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Uploaded: {new Date(invoice.createdAt).toLocaleDateString()}
                </Typography>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {invoices.length === 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  No invoices found. Upload your first invoice to get started!
                </Typography>
                <Box textAlign="center" mt={2}>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/upload')}
                  >
                    Upload Invoice
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default InvoiceList;
