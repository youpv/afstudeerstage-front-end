import { createContext, useContext, useEffect, useReducer, useState } from 'react'
import { getIntegrationConfigs, saveIntegrationConfig, updateIntegrationConfig, deleteIntegrationConfig } from '../services/api-client.js'

/**
 * IntegrationContext holds a list of integrations and exposes helpers to mutate that list.
 * The list is persisted to localStorage as a fallback but also synced with the API.
 */
const IntegrationContext = createContext(null)

// --------- Reducer & actions -------------------------------------------------
function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return action.payload
    case 'ADD':
      return [...state, action.payload]
    case 'EDIT':
      return state.map((integration) =>
        integration.id === action.payload.id ? action.payload : integration,
      )
    case 'DELETE':
      return state.filter((integration) => integration.id !== action.payload)
    default:
      return state
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem('integrations')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function IntegrationProvider({ children }) {
  const [integrations, dispatch] = useReducer(reducer, [], loadFromStorage)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load integrations from API on initial mount
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setIsLoading(true)
        const response = await getIntegrationConfigs()
        
        // Extract the integrations array from the API response
        const apiIntegrations = response.data || [];
        
        console.log('API integrations:', apiIntegrations);
        dispatch({ type: 'INIT', payload: apiIntegrations })
      } catch (err) {
        console.error('Failed to load integrations from API:', err)
        setError('Failed to load integrations. Using localStorage data instead.')
        // Keep using localStorage data that was loaded in the initial state
      } finally {
        setIsLoading(false)
      }
    }

    fetchIntegrations()
  }, [])

  // Persist to localStorage whenever the list changes (as a backup)
  useEffect(() => {
    try {
      localStorage.setItem('integrations', JSON.stringify(integrations))
    } catch {
      // Fail silently – persistence is best‑effort only
    }
  }, [integrations])

  const addIntegration = async (integration) => {
    try {
      // First update the local state
      dispatch({ type: 'ADD', payload: integration })
      
      // Then try to save to API
      const response = await saveIntegrationConfig(integration)
      // If we get a successful response with a new ID, update the integration with it
      if (response && response.success && response.data) {
        // Update with the server-generated ID and any other fields
        dispatch({ type: 'EDIT', payload: response.data })
      }
    } catch (err) {
      console.error('Failed to save integration to API:', err)
      // State was already updated, so the user sees their change
      // We could add error handling UI here if needed
    }
  }

  const editIntegration = async (updated) => {
    try {
      // First update the local state
      dispatch({ type: 'EDIT', payload: updated })
      
      // Then try to update in API
      const response = await updateIntegrationConfig(updated.id, updated)
      // If we get a successful response, update with any changes from the server
      if (response && response.success && response.data) {
        dispatch({ type: 'EDIT', payload: response.data })
      }
    } catch (err) {
      console.error('Failed to update integration in API:', err)
      // State was already updated, so the user sees their change
    }
  }

  const deleteIntegration = async (id) => {
    try {
      // First update the local state
      dispatch({ type: 'DELETE', payload: id })
      
      // Then try to delete from API
      await deleteIntegrationConfig(id)
    } catch (err) {
      console.error('Failed to delete integration from API:', err)
      // State was already updated, so the user sees their change
    }
  }

  const value = {
    integrations,
    isLoading,
    error,
    addIntegration,
    editIntegration,
    deleteIntegration,
  }

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>
}

export function useIntegrations() {
  const ctx = useContext(IntegrationContext)
  if (!ctx) {
    throw new Error('useIntegrations must be used within an IntegrationProvider')
  }
  return ctx
} 