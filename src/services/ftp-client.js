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
    // --- START MOCK ---
    this.log(`FTPService.downloadFile: MOCKING FTP RESPONSE for path: ${remotePath}`);
    // Simulate a delay to emulate network latency
    const delay = 1000 + Math.random() * 1000; // Delay between 1 to 2 seconds
    await new Promise(resolve => setTimeout(resolve, delay));

    const mockedData = {
        "products": [
            {
                "id": "3100000025",
                "title": "DURACELL Alkaline Plus 3LR12 | MN1203",
                "sku": "3100000025",
                "ean": "5000394146235",
                "ean_case": "0",
                "ean_extra": [
                    5000394019317,
                    5000394038226,
                    5000394105508,
                    5000394114623
                ],
                "description": "DURACELL Alkaline Plus 3LR12 | MN1203 - 4.5 V - 5400 mAh Battery",
                "tags": [
                    "Batterij",
                    "3LR12"
                ],
                "salesunit": "BLIST",
                "shortcode": "MN1203",
                "orig_code": "05010694",
                "weight": 0.17,
                "price": 2.82,
                "stores": [
                    "ESHOPBE"
                ],
                "min_ord_qty": 1,
                "related": [
                    "3125003031"
                ],
                "env_cont": 5.3,
                "disposal_fee": 0.18,
                "brand": "Duracell",
                "properties": [
                    {
                        "prop_code": "BAT_TYPE",
                        "prop_name": "Battery type:",
                        "prod_value": "Alkaline Plus"
                    },
                    {
                        "prop_code": "BAT_EXEC",
                        "prop_name": "Battery model:",
                        "prod_value": "Special"
                    },
                    {
                        "prop_code": "P_TYPE",
                        "prop_name": "Packaging type:",
                        "prod_value": "Single pack"
                    },
                    {
                        "prop_code": "BAT_CODE",
                        "prop_name": "Battery code:",
                        "prod_value": "3LR12 | MN1203"
                    },
                    {
                        "prop_code": "CODE_SYNO",
                        "prop_name": "Battery Code Synonym:",
                        "prod_value": "312A"
                    },
                    {
                        "prop_code": "APPRO_FOR",
                        "prop_name": "Appropriate for:",
                        "prod_value": "Flashlight + Bicycle + Small Appliances"
                    },
                    {
                        "prop_code": "WATCH_BAT",
                        "prop_name": "Watch battery:",
                        "prod_value": "No"
                    },
                    {
                        "prop_code": "VOLT",
                        "prop_name": "Voltage:",
                        "prod_value": "4.5 V"
                    },
                    {
                        "prop_code": "BAT_CAP",
                        "prop_name": "Battery capacity:",
                        "prod_value": "5400 mAh"
                    },
                    {
                        "prop_code": "RECHAR",
                        "prop_name": "Rechargeable:",
                        "prod_value": "No"
                    },
                    {
                        "prop_code": "P_CONTENT",
                        "prop_name": "Packing content:",
                        "prod_value": "1 Piece"
                    },
                    {
                        "prop_code": "P_FORM",
                        "prop_name": "Packaging form:",
                        "prod_value": "Blister"
                    },
                    {
                        "prop_code": "SIZE",
                        "prop_name": "Size:",
                        "prod_value": "65 x 61 x 21 mm"
                    },
                    {
                        "prop_code": "LANG",
                        "prop_name": "Languages on packaging:",
                        "prod_value": "EN - NL - DE - FR - ES - IT"
                    }
                ],
                "model": [
                    "31.000.000.25",
                    "BAT0006",
                    "MN 1203",
                    "3 LR 12",
                    "312 A",
                    "4,5 V"
                ]
            },
            {
                "id": "3100000042",
                "title": "DURACELL Silveroxide 392 | 384 | SR41  - Button cell",
                "sku": "3100000042",
                "ean": "5000394067929",
                "ean_case": "0",
                "ean_extra": [
                    50953110
                ],
                "description": "DURACELL Silveroxide 392 | 384 | SR41  - 1.55 V - 40 mAh - Button cell",
                "tags": [
                    "Batterij"
                ],
                "salesunit": "BLIST",
                "shortcode": "392/384",
                "orig_code": "05007313",
                "weight": 0.005,
                "price": 1.36,
                "stores": [
                    "ESHOPBE"
                ],
                "min_ord_qty": 1,
                "alternative_products": [
                    "3125000392"
                ],
                "env_cont": 10.6,
                "brand": "Duracell",
                "properties": [
                    {
                        "prop_code": "BAT_TYPE",
                        "prop_name": "Battery type:",
                        "prod_value": "Silveroxide"
                    },
                    {
                        "prop_code": "BAT_EXEC",
                        "prop_name": "Battery model:",
                        "prod_value": "Button cell"
                    },
                    {
                        "prop_code": "P_TYPE",
                        "prop_name": "Packaging type:",
                        "prod_value": "Single pack"
                    },
                    {
                        "prop_code": "BAT_CODE",
                        "prop_name": "Battery code:",
                        "prod_value": "392 | 384 | SR41"
                    },
                    {
                        "prop_code": "CODE_SYNO",
                        "prop_name": "Battery Code Synonym:",
                        "prod_value": "V392 | V384 | SR41W | SR41WS"
                    },
                    {
                        "prop_code": "APPRO_FOR",
                        "prop_name": "Appropriate for:",
                        "prod_value": "Watches"
                    },
                    {
                        "prop_code": "WATCH_BAT",
                        "prop_name": "Watch battery:",
                        "prod_value": "Yes"
                    },
                    {
                        "prop_code": "VOLT",
                        "prop_name": "Voltage:",
                        "prod_value": "1.55 V"
                    },
                    {
                        "prop_code": "BAT_CAP",
                        "prop_name": "Battery capacity:",
                        "prod_value": "40 mAh"
                    },
                    {
                        "prop_code": "RECHAR",
                        "prop_name": "Rechargeable:",
                        "prod_value": "No"
                    },
                    {
                        "prop_code": "P_CONTENT",
                        "prop_name": "Packing content:",
                        "prod_value": "1 Piece"
                    },
                    {
                        "prop_code": "P_FORM",
                        "prop_name": "Packaging form:",
                        "prod_value": "Blister"
                    },
                    {
                        "prop_code": "SIZE",
                        "prop_name": "Size:",
                        "prod_value": "7.9 x 3.6 mm"
                    },
                    {
                        "prop_code": "LANG",
                        "prop_name": "Languages on packaging:",
                        "prod_value": "EN - NL - DE - FR - ES - IT"
                    }
                ],
                "model": [
                    "31.000.000.42",
                    "GPB1048",
                    "GPB1056",
                    "0000050953110",
                    "3100000064",
                    "AG 3",
                    "AG-3",
                    "CR 392",
                    "D 384",
                    "D 392",
                    "FC 9327",
                    "G 3",
                    "G 3 A",
                    "GP 192",
                    "GP 384",
                    "HORLOGE",
                    "L 736",
                    "L 736 H",
                    "LR 41",
                    "LR 736",
                    "MS 312",
                    "SB-A 1",
                    "SB-B 1",
                    "SB-D 1",
                    "SR 41",
                    "SR 41 SW",
                    "SR 41 W",
                    "T 192",
                    "V 3 GA",
                    "V 384",
                    "V 392",
                    "V 527",
                    "V 547",
                    "1,55 V",
                    "192",
                    "247",
                    "247 B",
                    "280-13",
                    "280-18",
                    "384",
                    "392",
                    "392 A",
                    "527",
                    "547"
                ]
            },
            {
                "id": "3100000046",
                "title": "DURACELL Alkaline LR44 | A76 - Duo Pack - Button cell",
                "sku": "3100000046",
                "ean": "5000394504424",
                "ean_case": "0",
                "ean_extra": [
                    50936915
                ],
                "description": "DURACELL Alkaline LR44 | A76 - Duo Pack - 1.5 V - 150 mAh - Button cell",
                "tags": [
                    "Batterij"
                ],
                "salesunit": "BLIST",
                "shortcode": "LR44",
                "orig_code": "05007795",
                "weight": 0.01,
                "price": 0.96,
                "stores": [
                    "ESHOPBE"
                ],
                "min_ord_qty": 1,
                "related": [
                    "3100000446",
                    "3125000244"
                ],
                "env_cont": 10.6,
                "disposal_fee": 0.01,
                "brand": "Duracell",
                "properties": [
                    {
                        "prop_code": "BAT_TYPE",
                        "prop_name": "Battery type:",
                        "prod_value": "Alkaline"
                    },
                    {
                        "prop_code": "BAT_EXEC",
                        "prop_name": "Battery model:",
                        "prod_value": "Button cell"
                    },
                    {
                        "prop_code": "P_TYPE",
                        "prop_name": "Packaging type:",
                        "prod_value": "Duo Pack"
                    },
                    {
                        "prop_code": "BAT_CODE",
                        "prop_name": "Battery code:",
                        "prod_value": "LR44 | A76"
                    },
                    {
                        "prop_code": "CODE_SYNO",
                        "prop_name": "Battery Code Synonym:",
                        "prod_value": "V13GA | 76A"
                    },
                    {
                        "prop_code": "APPRO_FOR",
                        "prop_name": "Appropriate for:",
                        "prod_value": "Watches + Small Appliances"
                    },
                    {
                        "prop_code": "WATCH_BAT",
                        "prop_name": "Watch battery:",
                        "prod_value": "Yes"
                    },
                    {
                        "prop_code": "VOLT",
                        "prop_name": "Voltage:",
                        "prod_value": "1.5 V"
                    },
                    {
                        "prop_code": "BAT_CAP",
                        "prop_name": "Battery capacity:",
                        "prod_value": "150 mAh"
                    },
                    {
                        "prop_code": "RECHAR",
                        "prop_name": "Rechargeable:",
                        "prod_value": "No"
                    },
                    {
                        "prop_code": "P_CONTENT",
                        "prop_name": "Packing content:",
                        "prod_value": "2 Pieces"
                    },
                    {
                        "prop_code": "P_FORM",
                        "prop_name": "Packaging form:",
                        "prod_value": "Blister"
                    },
                    {
                        "prop_code": "SIZE",
                        "prop_name": "Size:",
                        "prod_value": "11.5 x 5.4 mm"
                    },
                    {
                        "prop_code": "LANG",
                        "prop_name": "Languages on packaging:",
                        "prod_value": "EN - NL - DE - FR - ES - IT"
                    }
                ],
                "model": [
                    "31.000.000.46",
                    "B11",
                    "A 160",
                    "A 76",
                    "AG 13",
                    "ALKALINE",
                    "G 13",
                    "KA 76",
                    "L 1154",
                    "LR 44",
                    "PX 76 A",
                    "V 13 GA",
                    "1,5 V",
                    "2 PACK",
                    "76 A"
                ]
            }
        ]
    };
    return mockedData; // Since the function is async, this will be wrapped in a Promise.
    // --- END MOCK ---

    /*
    // Original code:
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
    */
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
    // Allow immediate success when using specific mock credentials (e.g., during local development)
    // If the provided host, user, and password match the specific mock values,
    // we skip any attempt to open a real FTP connection and return success.
    // This enables the wizard connection step to work entirely with mocked data.
    const isMockHost = credentials?.host && String(credentials.host).toLowerCase() === 'ftp.fightclub.nl';
    const isMockUser = credentials?.user && String(credentials.user) === 'Fightclub';
    const isMockPassword = credentials?.password && String(credentials.password) === 'Pixels';

    if (isMockHost && isMockUser && isMockPassword) {
      this.log('FTPService.testConnection: Detected specific mock credentials – returning success without network call');
      return { success: true, error: null };
    }

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