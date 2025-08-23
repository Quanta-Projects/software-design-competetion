// Utility functions for application configuration

/**
 * Get the API base URL from runtime configuration or fallback to environment variable
 * This allows the API URL to be changed after build by modifying public/config.js
 */
export const getApiBaseUrl = () => {
  // First try to get from runtime config (window.APP_CONFIG)
  if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
    return window.APP_CONFIG.API_BASE_URL;
  }
  
  // Fallback to environment variable during development
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // Default fallback
  return 'http://localhost:8080/api';
};

/**
 * Build a complete API URL by combining base URL with endpoint
 */
export const getApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  // Remove leading slash from endpoint if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
};
