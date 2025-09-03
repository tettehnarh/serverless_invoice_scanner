import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const Upload: React.FC = () => {
  const [uploads, setUploads] = useState<FileUpload[]>([]);

  const onDrop = (acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    
    setUploads(prev => [...prev, ...newUploads]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    // Simulate upload process
    for (let i = 0; i < uploads.length; i++) {
      if (uploads[i].status === 'pending') {
        setUploads(prev => prev.map((upload, idx) => 
          idx === i ? { ...upload, status: 'uploading' } : upload
        ));

        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploads(prev => prev.map((upload, idx) => 
            idx === i ? { ...upload, progress } : upload
          ));
        }

        setUploads(prev => prev.map((upload, idx) => 
          idx === i ? { ...upload, status: 'success', progress: 100 } : upload
        ));
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const pendingUploads = uploads.filter(upload => upload.status === 'pending');
  const hasUploads = uploads.length > 0;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Invoice
      </Typography>

      <Card>
        <CardContent>
          <Box
            {...getRootProps()}
            className={`upload-dropzone ${isDragActive ? 'active' : ''}`}
            sx={{ mb: 3 }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              or click to select files
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: PDF, PNG, JPG, JPEG, TIFF, BMP (max 10MB)
            </Typography>
          </Box>

          {hasUploads && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Files to Upload
              </Typography>
              
              <List>
                {uploads.map((upload, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <FileIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={upload.file.name}
                      secondary={`${formatFileSize(upload.file.size)} • ${upload.status}`}
                    />
                    {upload.status === 'uploading' && (
                      <Box sx={{ width: 100, mr: 2 }}>
                        <LinearProgress variant="determinate" value={upload.progress} />
                      </Box>
                    )}
                    {upload.status === 'pending' && (
                      <IconButton onClick={() => removeFile(index)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </ListItem>
                ))}
              </List>

              {pendingUploads.length > 0 && (
                <Box mt={2}>
                  <Button
                    variant="contained"
                    onClick={uploadFiles}
                    startIcon={<UploadIcon />}
                    size="large"
                  >
                    Upload {pendingUploads.length} File{pendingUploads.length > 1 ? 's' : ''}
                  </Button>
                </Box>
              )}
            </Box>
          )}

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>How it works:</strong>
            </Typography>
            <Typography variant="body2">
              1. Upload your invoice files (PDF or images)
            </Typography>
            <Typography variant="body2">
              2. Our AI will automatically extract text and data
            </Typography>
            <Typography variant="body2">
              3. View the structured results in your invoice list
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Upload;
