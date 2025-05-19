/**
 * API Client service for managing integration configurations
 */

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Save an integration configuration to the API
 * @param {Object} integrationConfig - The integration configuration object
 * @returns {Promise<Object>} The saved integration configuration
 */
export const saveIntegrationConfig = async (integrationConfig) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(integrationConfig)
    });

    if (!response.ok) {
      throw new Error(`Error saving integration: ${response.statusText}`);
    }

    const result = await response.json();
    // Return the data directly or the entire response
    return result;
  } catch (error) {
    console.error('Error saving integration config:', error);
    throw error;
  }
};

/**
 * Get all integration configurations from the API
 * @returns {Promise<Array>} Array of integration configurations
 */
export const getIntegrationConfigs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/configs`);
    
    if (!response.ok) {
      throw new Error(`Error fetching integrations: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('API response from configs endpoint:', result);
    return result;
  } catch (error) {
    console.error('Error fetching integration configs:', error);
    throw error;
  }
};

/**
 * Update an existing integration configuration
 * @param {string} id - The ID of the integration to update
 * @param {Object} integrationConfig - The updated integration configuration
 * @returns {Promise<Object>} The updated integration configuration
 */
export const updateIntegrationConfig = async (id, integrationConfig) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/configs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(integrationConfig)
    });

    if (!response.ok) {
      throw new Error(`Error updating integration: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating integration config:', error);
    throw error;
  }
};

/**
 * Delete an integration configuration
 * @param {string} id - The ID of the integration to delete
 * @returns {Promise<Object>} Response from the API
 */
export const deleteIntegrationConfig = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/configs/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Error deleting integration: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting integration config:', error);
    throw error;
  }
};

/**
 * Sync an integration
 * @param {string} id - The ID of the integration to sync
 * @returns {Promise<Object>} The sync response
 */
export const syncIntegration = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ configId: id })
    });

    if (!response.ok) {
      throw new Error(`Error syncing integration: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error syncing integration:', error);
    throw error;
  }
}; 