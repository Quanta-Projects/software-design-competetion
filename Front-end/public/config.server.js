// Runtime Configuration for Server Backend Connection
// Place this file in public/config.js and update the API_BASE_URL to your server IP

window.APP_CONFIG = {
  // Replace 'YOUR_SERVER_IP' with your actual server IP address
  // Example: API_BASE_URL: 'http://192.168.1.100:8080/api'
  API_BASE_URL: 'http://YOUR_SERVER_IP:8080/api',
  
  // Alternative local configuration for development
  // API_BASE_URL: 'http://localhost:8080/api',
  
  // File upload configuration
  MAX_FILE_SIZE: 10485760, // 10MB
  ALLOWED_FILE_TYPES: ['jpg', 'jpeg', 'png', 'tiff', 'gif', 'bmp', 'webp']
};
