import {
  Page,
  Layout,
  Card,
  EmptyState,
  ResourceList,
  ResourceItem,
  Text,
  InlineStack,
  BlockStack,
  ButtonGroup,
  Button,
  Filters,
  Pagination,
} from '@shopify/polaris'
import { PlusIcon, EditIcon, DeleteIcon, RefreshIcon } from '@shopify/polaris-icons'
import { useCallback, useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIntegrations } from '../context/IntegrationContext.jsx'
import { syncIntegration } from '../services/api-client.js'

// --- API Integration ---
const syncIntegrationApi = async (integrationId) => {
  try {
    return await syncIntegration(integrationId);
  } catch (error) {
    console.error(`Error syncing integration ${integrationId}:`, error);
    throw error;
  }
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
  
  // Make sure integrations is always an array
  const rawIntegrations = integrationsProp ?? ctxIntegrations
  const integrations = Array.isArray(rawIntegrations) ? rawIntegrations : []
  
  console.log('Dashboard integrations:', integrations);

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

  const handleFiltersChange = useCallback((value) => {
    setQueryValue(value)
    setCurrentPage(1)
  }, [])

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page)
  }, [])

  const handleSyncClick = useCallback((id) => {
     setSyncingId(id);
     syncMutation.mutate(id);
     // Call the original onSync prop if it exists and might do other things
     if (onSync) {
       onSync(id);
     }
  }, [syncMutation, onSync]);

  const sortOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Connection Type', value: 'connectionType' },
    { label: 'Sync Frequency', value: 'syncFrequency' },
  ]

  const filterControl = (
    <Filters
      queryValue={queryValue}
      filters={[]}
      onQueryChange={handleFiltersChange}
      onQueryClear={() => setQueryValue('')}
      onClearAll={() => {
        setQueryValue('')
      }}
    />
  )

  const hasIntegrations = integrations.length > 0

  const filteredIntegrations = integrations
    .filter((integration) => {
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
          return a.syncFrequency - b.syncFrequency
        default:
          return 0
      }
    })

  const paginatedIntegrations = filteredIntegrations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const renderItem = useCallback((item) => {
    const { id, name, connectionType, syncFrequency } = item
    // Assuming 'url' is part of the item data or constructed
    const itemUrl = `/integrations/${id}` // Example URL

    return (
      <ResourceItem
        id={id}
        url={itemUrl} // Make the item clickable (optional)
        accessibilityLabel={`View details for ${name}`}
        persistActions
      >
        <InlineStack align="space-between" blockAlign="center" wrap={false}>
          <BlockStack gap="100">
            <Text variant="bodyMd" fontWeight="bold" as="h3">
              {name}
            </Text>
            <InlineStack gap="100" align="center">
              <Text variant="bodySm" tone="subdued">{connectionType}</Text>
              <Text variant="bodySm" tone="subdued">— Syncs every {syncFrequency}h</Text>
            </InlineStack>
          </BlockStack>
          <ButtonGroup>
            <Button
              icon={RefreshIcon}
              accessibilityLabel={`Sync ${name}`}
              onClick={(event) => {
                event.stopPropagation()
                handleSyncClick(id)
              }}
              variant="tertiary"
              loading={syncingId === id}
              disabled={syncMutation.isPending}
            />
            <Button
              icon={EditIcon}
              accessibilityLabel={`Edit ${name}`}
              onClick={(event) => {
                event.stopPropagation()
                onEdit(id)
              }}
              variant="tertiary"
            />
            <Button
              icon={DeleteIcon}
              accessibilityLabel={`Delete ${name}`}
              onClick={(event) => {
                event.stopPropagation()
                onDelete(id)
              }}
              variant="tertiary"
              tone="critical"
            />
          </ButtonGroup>
        </InlineStack>
      </ResourceItem>
    )
  }, [onEdit, onDelete, handleSyncClick, syncingId, syncMutation.isPending])


  const emptyStateMarkup = (
    <Card roundedAbove="sm">
      <EmptyState
        heading="Manage your data integrations"
        action={{ content: 'Create integration', icon: PlusIcon, onAction: onCreate }}
        secondaryAction={{
          content: 'Learn more',
          onAction: handleLearnMore,
        }}
        image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
        imageContained // Constrains image width for better layout
      >
        <Text variant="bodyMd" tone="subdued">
          Connect your ERP, PIM, or other data sources to automatically sync product information with Shopify.
        </Text>
      </EmptyState>
    </Card>
  )

  const integrationsListMarkup = (
    <Card roundedAbove="sm">
      <ResourceList
        resourceName={{ singular: 'integration', plural: 'integrations' }}
        items={paginatedIntegrations}
        renderItem={renderItem}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        sortOptions={sortOptions}
        sortValue={sortValue}
        onSortChange={handleSortChange}
        filterControl={filterControl}
        loading={syncMutation.isPending}
      />
      {filteredIntegrations.length > ITEMS_PER_PAGE && (
        <div style={{ padding: '1rem' }}>
          <Pagination
            hasPrevious={currentPage > 1}
            hasNext={currentPage < Math.ceil(filteredIntegrations.length / ITEMS_PER_PAGE)}
            onPrevious={() => handlePageChange(currentPage - 1)}
            onNext={() => handlePageChange(currentPage + 1)}
            label={`${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(
              currentPage * ITEMS_PER_PAGE,
              filteredIntegrations.length
            )} of ${filteredIntegrations.length}`}
          />
        </div>
      )}
    </Card>
  )

  return (
    <Page
      title="Integrations Dashboard"
      primaryAction={hasIntegrations ? { // Only show primary action if needed, or adjust logic
        content: 'Create integration',
        icon: PlusIcon,
        onAction: onCreate,
      } : null}
    >
      <Layout>
        <Layout.Section>
          {hasIntegrations ? integrationsListMarkup : emptyStateMarkup}
        </Layout.Section>
      </Layout>
    </Page>
  )
}

export default Dashboard 