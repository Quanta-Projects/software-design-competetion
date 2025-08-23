# API Configuration

This application supports configurable API URLs that can be changed both during development and after building for production.

## Configuration Methods

### 1. Runtime Configuration (Recommended for Production)

The API URL can be changed **after building** by modifying the `public/config.js` file:

```javascript
// public/config.js
window.APP_CONFIG = {
  API_BASE_URL: 'https://your-production-api.com/api'
};
```

This method allows you to:
- Deploy the same build to different environments
- Change the API URL without rebuilding the application
- Configure the API URL on the server after deployment

### 2. Environment Variables (Development & Build Time)

For development or build-time configuration, use environment variables:

Create a `.env.development` file:
```
REACT_APP_API_BASE_URL=http://localhost:8080/api
```

Create a `.env.production` file:
```
REACT_APP_API_BASE_URL=https://your-production-api.com/api
```

## Priority Order

The application uses the following priority order for API URL configuration:

1. **Runtime config** (`window.APP_CONFIG.API_BASE_URL`) - highest priority
2. **Environment variable** (`REACT_APP_API_BASE_URL`)
3. **Default fallback** (`http://localhost:8080/api`) - lowest priority

## Deployment Examples

### Example 1: Docker Deployment
```dockerfile
# Build the React app
FROM node:16 AS build
COPY . /app
WORKDIR /app
RUN npm install && npm run build

# Serve with nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Override config at runtime
COPY docker-config.js /usr/share/nginx/html/config.js
```

### Example 2: Static Hosting (Netlify, Vercel, etc.)
After deployment, simply modify the `config.js` file in your hosting provider's file manager or through their CLI:

```bash
# Update the deployed config.js file
echo "window.APP_CONFIG = { API_BASE_URL: 'https://api.your-domain.com/api' };" > build/config.js
```

## Development

For development, the app will use the environment variable from `.env.development` or fall back to `http://localhost:8080/api`.

## Testing Configuration

You can test different API URLs by opening your browser's developer console and running:

```javascript
window.APP_CONFIG = { API_BASE_URL: 'http://different-api.com/api' };
location.reload();
```
