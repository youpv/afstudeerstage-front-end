/**
 * FTP Client Service
 * Provides robust FTP connection and file operations with error handling and retries.
 * This implementation focuses on read-only operations.
 */

import { Client as FTPClient } from 'basic-ftp'

// Default configuration
const DEFAULT_CONFIG = {
  maxRetries: 1,
  retryDelay: 1000, // ms
  timeout: 30000, // ms
  keepAlive: true,
  keepAliveInterval: 10000, // ms
  debug: false,
  connectionPoolSize: 2
}

// Connection pool to reuse connections
const connectionPool = []

class FTPService {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.log = this.config.debug ? console.log : () => {}
  }

  /**
   * Create connection parameters object from credentials
   */
  _createConnectionParams(credentials) {
    const { host, port, user, password } = credentials
    
    return {
      host,
      port: port || 21,
      user,
      password
    }
  }

  /**
   * Get an available connection from the pool or create a new one
   */
  async _getConnection(credentials) {
    const params = this._createConnectionParams(credentials)
    
    // Try to find an available connection in the pool
    for (let i = 0; i < connectionPool.length; i++) {
      const conn = connectionPool[i]
      if (!conn.inUse && conn.host === params.host && conn.user === params.user) {
        this.log(`Reusing FTP connection for ${params.host}`)
        conn.inUse = true
        
        // Check if connection is still alive
        try {
          await conn.client.pwd()
          return conn
        } catch (/* eslint-disable-next-line no-unused-vars */
          _
        ) {
          // Ignore the specific error, we just need to know the connection failed
          this.log(`Stale connection detected for ${params.host}, creating new one`)
          await this._closeConnection(conn.client)
          connectionPool.splice(i, 1)
          break
        }
      }
    }

    // Create new connection if none found in pool
    const client = new FTPClient()
    
    try {
      this.log(`Creating new FTP connection to ${params.host}:${params.port}`)
      
      client.ftp.socket.setKeepAlive(this.config.keepAlive, this.config.keepAliveInterval)
      client.ftp.verbose = this.config.debug
      await client.access({
        host: params.host,
        port: params.port,
        user: params.user,
        password: params.password,
        secure: false,
        secureOptions: null,
        timeout: this.config.timeout
      })
      
      const connection = { 
        client, 
        inUse: true, 
        host: params.host, 
        user: params.user,
        timestamp: Date.now()
      }
      
      // Only add to pool if we haven't reached the maximum size
      if (connectionPool.length < this.config.connectionPoolSize) {
        connectionPool.push(connection)
      }
      
      return connection
    } catch (error) {
      await this._closeConnection(client)
      throw error
    }
  }

  /**
   * Release a connection back to the pool
   */
  _releaseConnection(connection) {
    if (!connection) return
    
    const poolConnection = connectionPool.find(
      conn => conn.client === connection.client
    )
    
    if (poolConnection) {
      poolConnection.inUse = false
      poolConnection.timestamp = Date.now()
    }
  }

  /**
   * Close and remove a connection
   */
  async _closeConnection(client) {
    if (!client || client.closed) return // Check if already closed
    
    try {
      client.close()
    } catch (error) {
      // Ignore errors during close, especially if already closed
      this.log('Ignoring error during connection close:', error.message)
    }
  }

  /**
   * Execute an operation with retries
   */
  async _withRetry(operation, credentials) {
    let lastError = null
    let connection = null
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Get connection if we don't have one yet
        if (!connection) {
          connection = await this._getConnection(credentials)
        }
        
        // Execute the operation
        const result = await operation(connection.client)
        
        // Release connection back to pool
        this._releaseConnection(connection)
        
        return result
      } catch (error) {
        // Immediately abort on any password-related error to avoid lockout
        const errMsg = error.message || ''
        if (/password.*wrong|wrong.*password/i.test(errMsg)) {
          throw error
        }
        lastError = error
        this.log(`Operation failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}):`, error.message)
        
        // Close connection on error as it might be in a bad state
        if (connection) {
          const index = connectionPool.findIndex(conn => conn.client === connection.client)
          
          if (index !== -1) {
            connectionPool.splice(index, 1)
          }
          
          await this._closeConnection(connection.client)
          connection = null
        }
        
        // If we have retries left, wait before trying again
        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
        }
      }
    }
    
    // If we got here, all attempts failed
    throw new Error(`FTP operation failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Download a file from the FTP server
   * @param {Object} credentials - Connection credentials
   * @param {string} remotePath - Path of the file on the FTP server
   * @returns {Promise<Object|string|Buffer>} - Downloaded file content.
   */
  async downloadFile(credentials, remotePath) {
    return this._withRetry(async (client) => {
      // Create an in‑memory buffer by streaming the download into a Writable
      const { Writable } = await import('stream')
      const { Buffer } = await import('buffer')
      const chunks = []

      const memoryWriter = new Writable({
        write(chunk, _enc, next) {
          chunks.push(chunk)
          next()
        }
      })

      // The promise resolves after the download completes
      await client.downloadTo(memoryWriter, remotePath)

      const buffer = Buffer.concat(chunks)

      // Try to parse JSON if it looks like JSON
      let text = ''
      try {
        text = new TextDecoder("utf-8", { fatal: false }).decode(buffer)
        const trimmedText = text.trim();
        if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
           try {
             return JSON.parse(text) // Return parsed object
           } catch (parseError) {
             this.log('Data looked like JSON but parsing failed. Returning as text.', parseError.message);
             return text; // Return full text if JSON parse fails
           }
        }
        return text // Return as text if not starting like JSON
      } catch (decodeError) {
        this.log('Failed to decode buffer as text, returning raw buffer.', decodeError.message)
        return buffer // Return raw buffer if decoding fails
      }
    }, credentials)
  }

  /**
   * List files in a directory
   * @param {Object} credentials - Connection credentials
   * @param {string} remotePath - Path of the directory on the FTP server
   * @returns {Promise<Array>} - List of files and directories
   */
  async listFiles(credentials, remotePath = '/') {
    return this._withRetry(async (client) => {
      const list = await client.list(remotePath)
      return list.map(item => ({
        name: item.name,
        type: item.isDirectory ? 'directory' : 'file',
        size: item.size,
        modifiedAt: item.modifiedAt
      }))
    }, credentials)
  }

  /**
   * Test connection to verify credentials
   * @param {Object} credentials - Connection credentials
   * @returns {Promise<{success: boolean, error: string | null}>} - Object indicating success and potential error message.
   */
  async testConnection(credentials) {
    try {
      // The operation inside _withRetry doesn't really matter for test,
      // as _withRetry will throw if connection fails during _getConnection.
      // We just need it to attempt the connection.
      // eslint-disable-next-line no-unused-vars
      await this._withRetry(async (_client) => {
        // Optional: Add a simple command like PWD to be slightly more robust
        // await _client.pwd(); 
        return true; // Indicate the operation itself succeeded
      }, credentials);
      return { success: true, error: null }; // Return success object if _withRetry completes
    } catch (error) {
      // This catch is hit if _withRetry throws after all retries fail
      const errorMessage = error.message || 'Unknown connection error';
      this.log('Connection test failed:', errorMessage);
      return { success: false, error: errorMessage }; // Return failure object with error message
    }
  }

  /**
   * Clean up old connections from the pool
   */
  cleanupConnections() {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    
    // Clean up connections that haven't been used for a while
    for (let i = connectionPool.length - 1; i >= 0; i--) {
      const conn = connectionPool[i]
      if (!conn.inUse && (now - conn.timestamp) > maxAge) {
        this._closeConnection(conn.client)
        connectionPool.splice(i, 1)
      }
    }
  }
}

// Create and export a singleton instance
const ftpService = new FTPService()

// Periodically clean up old connections
setInterval(() => ftpService.cleanupConnections(), 60000) // Every minute

export default ftpService 