import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import ftpService from './src/services/ftp-client' // Import the service

// Custom plugin for FTP API
const ftpApiPlugin = () => ({
  name: 'ftp-api',
  configureServer(server) {
    // Helper to parse JSON body
    const parseBody = (request) => new Promise((resolve, reject) => {
      let body = ''
      request.on('data', chunk => { body += chunk.toString() })
      request.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (parseError) {
          reject(new Error(`Invalid JSON body: ${parseError.message}`))
        }
      })
      request.on('error', (networkError) => reject(networkError))
    })

    // Route: Test Connection
    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/api/ftp/test' && req.method === 'POST') {
        try {
          const credentials = await parseBody(req)
          // Get the result object { success, error } from the service
          const result = await ftpService.testConnection(credentials)
          
          res.setHeader('Content-Type', 'application/json')
          // Send the entire result object back to the client
          res.end(JSON.stringify(result)) 
        } catch (error) {
          // This catch block is now only for unexpected errors (e.g., parseBody fails)
          console.error('FTP API Test - Unexpected Error:', error)
          res.statusCode = error.message.startsWith('Invalid JSON body') ? 400 : 500
          res.setHeader('Content-Type', 'application/json')
          // Ensure the response format matches the expected { success, error } structure
          res.end(JSON.stringify({ success: false, error: error.message || 'Server error' }))
        }
        return // Stop processing
      }

      // Route: Download File Content
      if (req.url === '/api/ftp/download' && req.method === 'POST') {
        try {
          const { credentials, filePath } = await parseBody(req)
          if (!credentials || !filePath) {
            throw new Error('Missing credentials or filePath')
          }
          // Get the full data from the service
          const data = await ftpService.downloadFile(credentials, filePath)
          
          // Send the full data back
          // Note: If data is a Buffer, stringify might turn it into an object with type:'Buffer', data:[...]
          // Consider how the frontend will handle potential Buffer types if non-text files are possible.
          res.setHeader('Content-Type', 'application/json') 
          res.end(JSON.stringify({ success: true, data }));

        } catch (error) {
          console.error('FTP API Download Error:', error)
          const statusCode = error.message.startsWith('Missing') ? 400 
                           : error.message.startsWith('Invalid JSON') ? 400 
                           : error.code 
                           ? parseInt(error.code) >= 100 && parseInt(error.code) < 600 ? parseInt(error.code) : 500 
                           : 500; 
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: false, error: error.message || 'Server error' }))
        }
        return // Stop processing
      }

      // Pass request to the next middleware if URL doesn't match
      next()
    })
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ftpApiPlugin()], // Add the custom plugin
})
