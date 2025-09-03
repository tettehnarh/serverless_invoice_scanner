import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import { configureAuth } from './services/auth';
import { AppConfig, AuthState } from './types';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import InvoiceDetail from './pages/InvoiceDetail';
import Upload from './pages/Upload';
import Layout from './components/Layout';
// import { useAuth } from './hooks/useAuth';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
});

// Load configuration from environment or config file
const loadConfig = async (): Promise<AppConfig> => {
  try {
    // Try to load from public/env.json first (for deployed environments)
    const response = await fetch('/env.json');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('Could not load env.json, using environment variables');
  }

  // Fallback to environment variables
  return {
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
    userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
    region: process.env.REACT_APP_REGION || 'us-east-1',
    environment: process.env.REACT_APP_ENVIRONMENT || 'dev',
  };
};

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const appConfig = await loadConfig();
        setConfig(appConfig);
        
        // Configure authentication
        configureAuth(appConfig);
        
        console.log('App initialized with config:', {
          ...appConfig,
          userPoolId: appConfig.userPoolId ? '***' : 'missing',
          userPoolClientId: appConfig.userPoolClientId ? '***' : 'missing',
        });
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (loading || !config) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Authenticator>
        {({ signOut, user }) => (
          <Router>
            <Layout user={user} onSignOut={signOut}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </Router>
        )}
      </Authenticator>
    </ThemeProvider>
  );
}

export default App;
