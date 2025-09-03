import React from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <UploadIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Upload Invoice</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload PDF or image files to extract invoice data automatically using AI.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/upload')}
                startIcon={<UploadIcon />}
              >
                Upload Now
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ReceiptIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">View Invoices</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Browse and search through your processed invoices with extracted data.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate('/invoices')}
                startIcon={<ReceiptIcon />}
              >
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No recent activity. Upload your first invoice to get started!
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
