import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  Badge,
  Box,
  Divider,
  Modal,
  Spinner
} from '@shopify/polaris'
import { EditIcon, RefreshIcon, DeleteIcon, DataTableIcon, ProductIcon } from '@shopify/polaris-icons'
import { useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIntegrations } from '../context/IntegrationContext'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import productData from '../mock/productdata.json'

// --- API Simulation --- 
const syncIntegrationApi = async (integrationId) => {
  console.log(`Simulating sync for integration: ${integrationId}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  // Simulate potential failure
  if (Math.random() < 0.1) { // 10% chance of failure
    throw new Error('Simulated sync failed: Random error');
  }
  return { success: true, syncedAt: new Date().toISOString() };
};

const deleteIntegrationApi = async (integrationId) => {
  console.log(`Simulating delete for integration: ${integrationId}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  // Simulate potential failure (less likely for delete)
  if (Math.random() < 0.05) { // 5% chance of failure
    throw new Error('Simulated delete failed');
  }
  return { success: true };
};

export default function IntegrationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { integrations, deleteIntegration: deleteFromContext } = useIntegrations()
  const queryClient = useQueryClient()
  const [lastSync, setLastSync] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const integration = integrations.find(i => i.id === id)

  // --- React Query Mutations ---
  const syncMutation = useMutation({
    mutationFn: syncIntegrationApi,
    onSuccess: (data) => {
      setLastSync(new Date(data.syncedAt).toLocaleString());
      // Optionally invalidate queries that depend on sync status if needed
      // queryClient.invalidateQueries({ queryKey: ['integrations', id, 'status'] });
    },
    // onError: error is handled automatically and available in syncMutation.error
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIntegrationApi,
    onSuccess: () => {
      // Remove from local context state AFTER successful API call
      deleteFromContext(id);
      // Invalidate the main integrations list query if it exists
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      // Navigate back only after successful deletion
      navigate('/');
      setDeleteModalOpen(false); // Close modal on success
    },
    onError: (error) => {
      // Error is available in deleteMutation.error
      // Keep modal open on error to show feedback
      console.error("Delete failed:", error);
    }
  });

  // --- Event Handlers ---
  const handleSync = useCallback(() => {
    if (integration) {
      syncMutation.mutate(integration.id);
    }
  }, [integration, syncMutation]);

  const handleDeleteClick = useCallback(() => {
    setDeleteModalOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (integration) {
      deleteMutation.mutate(integration.id);
      // Don't close modal or navigate here, onSuccess handles it
    }
  }, [integration, deleteMutation]);

  const handleDeleteCancel = useCallback(() => {
    if (!deleteMutation.isPending) { // Prevent closing while deleting
      setDeleteModalOpen(false)
    }
  }, [deleteMutation.isPending])

  if (!integration) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card roundedAbove="sm">
              <Banner status="critical">
                <p>Integration not found</p>
              </Banner>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  const { 
    name, 
    connectionType, 
    syncFrequency, 
    description, 
    status = 'Active',
  } = integration

  // Use field mappings based on the product data structure
  const mappings = [
    { source: 'id', target: 'product_id', transform: 'None' },
    { source: 'title', target: 'product_title', transform: 'None' },
    { source: 'description', target: 'description_long', transform: 'HTML to Text' },
    { source: 'vendor', target: 'vendor_name', transform: 'None' },
    { source: 'price', target: 'price_amount', transform: 'Currency Format' }
  ]

  const getStatusBadge = (status) => {
    const toneMap = {
      'Active': 'success',
      'Paused': 'warning',
      'Error': 'critical',
      'Pending': 'info'
    }
    return <Badge tone={toneMap[status] || 'info'}>{status}</Badge>
  }

  return (
    <Page
      title={name}
      subtitle="Integration Details"
      primaryAction={{
        content: 'Edit',
        icon: EditIcon,
        onAction: () => navigate(`/integrations/${id}/edit`),
        disabled: syncMutation.isPending || deleteMutation.isPending, // Disable if actions are in progress
      }}
      secondaryActions={[
        {
          content: 'Sync now',
          icon: RefreshIcon,
          onAction: handleSync,
          loading: syncMutation.isPending,
          disabled: deleteMutation.isPending, // Disable if deleting
        },
        {
          content: 'Delete',
          icon: DeleteIcon,
          destructive: true,
          onAction: handleDeleteClick,
          loading: deleteMutation.isPending,
          disabled: syncMutation.isPending, // Disable if syncing
        }
      ]}
    >
      <Layout>
        <Layout.Section>
          <Card roundedAbove="sm">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingSm" as="h2">Overview</Text>
                <InlineStack gap="300">
                  {getStatusBadge(status)}
                  {lastSync && (
                    <Text variant="bodySm" tone="subdued">
                      Last synced: {lastSync}
                    </Text>
                  )}
                </InlineStack>
              </InlineStack>

              {/* Display Sync Error */} 
              {syncMutation.isError && (
                <Banner status="critical">
                  <p>Sync failed: {(syncMutation.error instanceof Error) ? syncMutation.error.message : 'Unknown error'}</p>
                </Banner>
              )}

              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="headingXs" as="h3">Connection Details</Text>
                  <InlineStack wrap={false} gap="400">
                    <BlockStack gap="100" minWidth="200px">
                      <Text variant="bodySm" tone="subdued">Type</Text>
                      <Text variant="bodyMd">{connectionType}</Text>
                    </BlockStack>
                    <BlockStack gap="100">
                      <Text variant="bodySm" tone="subdued">Sync Frequency</Text>
                      <Text variant="bodyMd">Every {syncFrequency} hours</Text>
                    </BlockStack>
                  </InlineStack>
                </BlockStack>

                {/* Display mutation status during sync */} 
                {syncMutation.isPending && (
                  <InlineStack gap="200" blockAlign="center">
                    <Spinner size="small" />
                    <Text tone="subdued">Syncing...</Text>
                  </InlineStack>
                )}

                {description && (
                  <>
                    <Divider />
                    <BlockStack gap="200">
                      <Text variant="headingXs" as="h3">Description</Text>
                      <Text variant="bodyMd">{description}</Text>
                    </BlockStack>
                  </>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="400">
            <Card roundedAbove="sm">
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingSm" as="h2">Field Mappings</Text>
                  <Button plain icon={DataTableIcon}>View all</Button>
                </InlineStack>
                
                <Box paddingBlockEnd="200">
                  <BlockStack gap="400">
                    {mappings.map((mapping, index) => (
                      <BlockStack key={index} gap="100">
                        <InlineStack gap="400" wrap={false} align="start">
                          <Box width="30%">
                            <BlockStack gap="100">
                              <Text variant="bodySm" tone="subdued">Source Field</Text>
                              <Text variant="bodyMd">{mapping.source}</Text>
                            </BlockStack>
                          </Box>
                          <Box width="30%">
                            <BlockStack gap="100">
                              <Text variant="bodySm" tone="subdued">Target Field</Text>
                              <Text variant="bodyMd">{mapping.target}</Text>
                            </BlockStack>
                          </Box>
                          <Box width="30%">
                            <BlockStack gap="100">
                              <Text variant="bodySm" tone="subdued">Transform</Text>
                              <Text variant="bodyMd">{mapping.transform}</Text>
                            </BlockStack>
                          </Box>
                        </InlineStack>
                        {index < mappings.length - 1 && <Divider />}
                      </BlockStack>
                    ))}
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>

            <Card roundedAbove="sm">
              <BlockStack gap="400">
                <Text variant="headingSm" as="h2">Example Data</Text>
                
                <BlockStack gap="400">
                  {productData.slice(0, 2).map((product, index) => (
                    <BlockStack key={index} gap="200">
                      <InlineStack align="space-between">
                        <InlineStack gap="200" blockAlign="center">
                          <ProductIcon size="small" />
                          <Text variant="headingXs" as="h3">{product.product_title}</Text>
                        </InlineStack>
                        <Text variant="bodyMd" tone="subdued">${product.price_amount}</Text>
                      </InlineStack>
                      
                      <BlockStack gap="100">
                        <Text variant="bodySm" tone="subdued">Description</Text>
                        <Text variant="bodyMd">{product.description_long}</Text>
                      </BlockStack>
                      
                      <BlockStack gap="100">
                        <Text variant="bodySm" tone="subdued">Vendor</Text>
                        <Text variant="bodyMd">{product.vendor_name}</Text>
                      </BlockStack>
                      
                      {index < productData.slice(0, 2).length - 1 && <Divider />}
                    </BlockStack>
                  ))}
                </BlockStack>
                
                {productData.length > 2 && (
                  <Box paddingBlockStart="200">
                    <Button plain>View all {productData.length} products</Button>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      <Modal
        open={deleteModalOpen}
        onClose={handleDeleteCancel}
        title="Delete integration"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: handleDeleteConfirm,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleDeleteCancel,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="200">
            <Text>
              Are you sure you want to delete the "{name}" integration? This action cannot be undone.
            </Text>
            <Text tone="subdued">
              All connected data and mappings will be permanently removed.
            </Text>
            {/* Display Delete Error in Modal */} 
            {deleteMutation.isError && (
              <Box paddingTop="200">
                <Banner status="critical">
                  Delete failed: {(deleteMutation.error instanceof Error) ? deleteMutation.error.message : 'Unknown error'}
                </Banner>
              </Box>
            )}
            {deleteMutation.isPending && (
              <Box paddingTop="200">
                <InlineStack gap="200" blockAlign="center">
                  <Spinner size="small" />
                  <Text tone="subdued">Deleting...</Text>
                </InlineStack>
              </Box>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  )
} 