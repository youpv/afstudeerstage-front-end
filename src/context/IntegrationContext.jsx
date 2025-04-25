import { createContext, useContext, useEffect, useReducer } from 'react'

/**
 * IntegrationContext holds a list of integrations and exposes helpers to mutate that list.
 * The list is persisted to localStorage so that a page refresh does not wipe state.
 */
const IntegrationContext = createContext(null)

// --------- Reducer & actions -------------------------------------------------
function reducer(state, action) {
  switch (action.type) {
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

  // Persist to localStorage whenever the list changes
  useEffect(() => {
    try {
      localStorage.setItem('integrations', JSON.stringify(integrations))
    } catch {
      // Fail silently – persistence is best‑effort only
    }
  }, [integrations])

  const addIntegration = (integration) => dispatch({ type: 'ADD', payload: integration })
  const editIntegration = (updated) => dispatch({ type: 'EDIT', payload: updated })
  const deleteIntegration = (id) => dispatch({ type: 'DELETE', payload: id })

  const value = {
    integrations,
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