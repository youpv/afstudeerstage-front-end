import { useCallback, useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIntegrations } from '../context/IntegrationContext.jsx'
import { Link } from 'react-router-dom'

// --- API Simulation (Should match IntegrationDetail) ---
const syncIntegrationApi = async (integrationId) => {
  console.log(`Simulating sync for integration: ${integrationId}`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  if (Math.random() < 0.1) {
    throw new Error('Simulated sync failed: Random error');
  }
  return { success: true, syncedAt: new Date().toISOString() };
};

// Dummy handler for Learn More action
const handleLearnMore = () => {
  console.log('Learn more clicked')
  // You can replace this with navigation or opening a modal/link
  window.open('https://help.shopify.com', '_blank');
}

function Dashboard({
  integrations: integrationsProp,
  onCreate,
  onEdit = (id) => console.log(`Edit requested for ${id}`),
  onDelete = (id) => console.log(`Delete requested for ${id}`),
  onSync = (id) => console.log(`Sync requested for ${id}`),
}) {
  // Fallback to context if integrations prop is undefined
  const { integrations: ctxIntegrations } = useIntegrations()
  const integrations = integrationsProp ?? ctxIntegrations

  const [selectedItems, setSelectedItems] = useState([])
  const [sortValue, setSortValue] = useState('name')
  const [queryValue, setQueryValue] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const ITEMS_PER_PAGE = 10

  // --- React Query --- 
  const queryClient = useQueryClient()

  const syncMutation = useMutation({
    mutationFn: syncIntegrationApi,
    onSuccess: (data, variables) => {
      console.log(`Sync success for ${variables} at ${data.syncedAt}`);
      // Invalidate queries that might show sync status or last synced time
      queryClient.invalidateQueries({ queryKey: ['integrations'] }); // Invalidate list if it shows status
      queryClient.invalidateQueries({ queryKey: ['integrations', variables] }); // Invalidate specific integration details
    },
    onError: (error, variables) => {
       console.error(`Sync failed for ${variables}:`, error);
       // TODO: Show error to user (e.g., using a Toast)
     },
  });

  // Keep track of which specific item is syncing
  const [syncingId, setSyncingId] = useState(null);

  useEffect(() => {
    if (syncMutation.isSuccess || syncMutation.isError) {
      setSyncingId(null); // Reset syncing state when mutation finishes
    }
  }, [syncMutation.isSuccess, syncMutation.isError]);

  const handleSortChange = useCallback((value) => {
    setSortValue(value)
    setCurrentPage(1)
  }, [])

  const handleQueryChange = useCallback((event) => {
    setQueryValue(event.target.value)
    setCurrentPage(1)
  }, [])
  
  const handleClearQuery = useCallback(() => {
      setQueryValue('');
      setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page)
  }, [])

  const handleSyncClick = useCallback((id) => {
     setSyncingId(id);
     syncMutation.mutate(id);
     if (onSync) {
       onSync(id);
     }
  }, [syncMutation, onSync]);

  const filterControl = (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor="integrationFilter">Filter Integrations:</label>
      <input 
        type="text" 
        id="integrationFilter" 
        value={queryValue} 
        onChange={handleQueryChange} 
        placeholder="Filter by name or type..." 
        style={{ marginLeft: '0.5rem', marginRight: '0.5rem'}}
      />
      <button onClick={handleClearQuery} disabled={!queryValue}>Clear</button>
    </div>
  )

  const hasIntegrations = integrations.length > 0

  const filteredIntegrations = integrations
    .filter((integration) => {
      if (!integration || !integration.name || !integration.connectionType) return false; // Safety check
      const matchesQuery = integration.name.toLowerCase().includes(queryValue.toLowerCase()) ||
        integration.connectionType.toLowerCase().includes(queryValue.toLowerCase())
      return matchesQuery
    })
    .sort((a, b) => {
      switch (sortValue) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'connectionType':
          return a.connectionType.localeCompare(b.connectionType)
        case 'syncFrequency':
          // Ensure comparison is numeric
          return (Number(a.syncFrequency) || 0) - (Number(b.syncFrequency) || 0)
        default:
          return 0
      }
    })

  const paginatedIntegrations = filteredIntegrations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleSelectionChange = (itemId, isChecked) => {
      setSelectedItems(prevSelected => {
          if (isChecked) {
              return [...prevSelected, itemId];
          } else {
              return prevSelected.filter(id => id !== itemId);
          }
      });
  };
  
  const handleSelectAll = (event) => {
      if (event.target.checked) {
          setSelectedItems(paginatedIntegrations.map(item => item.id));
      } else {
          setSelectedItems([]);
      }
  };
  
  const isAllSelected = paginatedIntegrations.length > 0 && selectedItems.length === paginatedIntegrations.length;
  
  const renderTableRows = paginatedIntegrations.map((item) => {
    const { id, name, connectionType, syncFrequency } = item
    const itemUrl = `/integrations/${id}`
    const isSelected = selectedItems.includes(id);

    return (
      <tr key={id}>
        <td>
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={(e) => handleSelectionChange(id, e.target.checked)} 
            aria-label={`Select ${name}`}
          />
        </td>
        <td><Link to={itemUrl}>{name}</Link></td>
        <td>{connectionType}</td>
        <td>{syncFrequency}h</td>
        <td>
          <button 
            onClick={() => handleSyncClick(id)} 
            disabled={syncMutation.isPending || syncingId === id} 
            style={{marginRight: '5px'}}
            title={`Sync ${name}`}
            >
            {syncingId === id ? 'Syncing...' : 'Sync'}
          </button>
          <button onClick={() => onEdit(id)} style={{marginRight: '5px'}} title={`Edit ${name}`}>Edit</button>
          <button onClick={() => onDelete(id)} style={{color: 'red'}} title={`Delete ${name}`}>Delete</button>
        </td>
      </tr>
    )
  });

  const emptyStateMarkup = (
    <div style={{ border: '1px solid #eee', padding: '2rem', textAlign: 'center' }}>
      <img 
        src="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg" 
        alt="" 
        style={{ maxWidth: '150px', marginBottom: '1rem' }}
      />
      <h2>Manage your data integrations</h2>
      <p style={{ color: 'gray', marginBottom: '1rem' }}>
        Connect your ERP, PIM, or other data sources to automatically sync product information with Shopify.
      </p>
      <button onClick={onCreate} style={{ marginRight: '0.5rem' }}>Create integration</button>
      <button onClick={handleLearnMore}>Learn more</button>
    </div>
  )

  const integrationsListMarkup = (
    <div>
      {filterControl}
      {syncMutation.isPending && <p>Loading integrations...</p>}
      
      {selectedItems.length > 0 && (
           <div style={{margin: '0.5rem 0', padding: '0.5rem', border: '1px solid blue'}}>Bulk actions for {selectedItems.length} items (e.g., delete selected) would go here.</div>
      )}
      
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc'}}>
                <input 
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={isAllSelected}
                    aria-label="Select all integrations on this page"
                 />
            </th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc'}}>
              Name 
              <button onClick={() => handleSortChange('name')} style={{ marginLeft: '5px', fontSize: '0.8em' }} title="Sort by Name">
                {sortValue === 'name' ? '▲' : '↕'}
              </button>
            </th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc'}}>
              Type
              <button onClick={() => handleSortChange('connectionType')} style={{ marginLeft: '5px', fontSize: '0.8em' }} title="Sort by Type">
                 {sortValue === 'connectionType' ? '▲' : '↕'}
              </button>
            </th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc'}}>
              Frequency
              <button onClick={() => handleSortChange('syncFrequency')} style={{ marginLeft: '5px', fontSize: '0.8em' }} title="Sort by Frequency">
                {sortValue === 'syncFrequency' ? '▲' : '↕'}
              </button>
            </th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc'}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {renderTableRows}
        </tbody>
      </table>
      
      {filteredIntegrations.length > ITEMS_PER_PAGE && (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <button 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage <= 1}
            style={{marginRight: '10px'}}
          >
            Previous
          </button>
          <span>
            {`${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(
              currentPage * ITEMS_PER_PAGE,
              filteredIntegrations.length
            )} of ${filteredIntegrations.length}`}
          </span>
          <button 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage >= Math.ceil(filteredIntegrations.length / ITEMS_PER_PAGE)}
            style={{marginLeft: '10px'}}
           >
            Next
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h1>Integrations Dashboard</h1>
          <button onClick={onCreate}>Create Integration</button>
      </div>
      
      <div>
        <div>
          {hasIntegrations ? integrationsListMarkup : emptyStateMarkup}
        </div>
      </div>
    </div>
  )
}

export default Dashboard 