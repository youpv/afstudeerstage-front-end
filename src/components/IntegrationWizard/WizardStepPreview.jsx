import { BlockStack, Text, Card, Divider, ButtonGroup, Button, InlineStack, Box, DescriptionList, Badge, Tag } from '@shopify/polaris';
import { ChevronLeftIcon, ChevronRightIcon } from '@shopify/polaris-icons';
import { useMemo } from 'react';


// --- Helper Functions ---

// Helper function to render value (handles arrays, objects, null/undefined)
const renderValue = (value) => {
  if (Array.isArray(value)) {
    // Handle potentially long arrays by truncating
    const displayItems = value.slice(0, 5); // Show first 5 items
    const truncated = value.length > 5 ? '...' : '';
    return `[${displayItems.join(', ')}${truncated}]`;
  } else if (typeof value === 'object' && value !== null) {
    // Attempt to stringify, but handle potential large objects
    try {
      const jsonString = JSON.stringify(value);
      if (jsonString.length > 100) { // Limit length
        return jsonString.substring(0, 100) + '...';
      }
      return jsonString;
    } catch (e) {
      console.warn('[WizardStepPreview] Error stringifying object:', e); // Log the error instead of ignoring
      return '[Object]'; // Fallback
    }
  } else if (value === null || value === undefined || String(value).trim() === '') {
      return <Text as="span" tone="subdued">_empty_</Text>;
  }
  return String(value);
};

// Helper to create DescriptionList items, skipping empty values
const createDescriptionListItems = (itemsObject) => {
    return Object.entries(itemsObject)
        .filter(([/* key */, value]) => value !== null && value !== undefined && String(value).trim() !== '') // Filter out empty values, comment out unused key
        .map(([key, value]) => ({
            term: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), // Format key nicely
            description: renderValue(value),
        }));
};

/**
 * Displays the mapped data preview for a single product/item.
 * @param {object} props
 * @param {string} props.stepTitle
 * @param {object | Array<object>} props.processedPreviewData - The data after applying dataPath.
 * @param {object} props.mappedPreviewData - The result of applying mappings to the current item.
 * @param {number} props.currentPreviewIndex
 * @param {(index: number) => void} props.setCurrentPreviewIndex
 */
function WizardStepPreview({
  stepTitle,
  processedPreviewData,
  mappedPreviewData,
  currentPreviewIndex,
  setCurrentPreviewIndex,
}) {
  const isArray = Array.isArray(processedPreviewData);
  const totalItems = isArray ? processedPreviewData.length : processedPreviewData ? 1 : 0;

  // --- DEBUGGING --- 
  
  // --- END DEBUGGING ---

  const handlePrevious = () => {
    setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1));
  };

  const handleNext = () => {
    setCurrentPreviewIndex(Math.min(totalItems - 1, currentPreviewIndex + 1));
  };

  const canNavigate = isArray && totalItems > 1;
  const canGoPrevious = canNavigate && currentPreviewIndex > 0;
  const canGoNext = canNavigate && currentPreviewIndex < totalItems - 1;

  // --- Data Extraction and Preparation for Rendering ---

  const {
      // Primary Fields
      title,
      status,
      bodyHtml,
      vendor,
      productType,
      tags,

      // Nested Structures
      seo, // { title, description }
      inventoryItem, // { sku, barcode, price, compareAtPrice, weight, weightUnit, inventoryPolicy, inventoryQuantity, inventoryManagement, taxable, taxCode, cost, requiresShipping, harmonizedSystemCode }

      // Metafields
      metafields, // Array: { namespace, key, type, value }

      // Other Top-Level Fields (Explicitly handle known ones if they appear here unexpectedly)
      publishedAt,
      requiresSellingPlan,
      templateSuffix,
      handle, // Product handle

      // Error/Info fields
      error: mappingError,
      info: mappingInfo,

      // Collect any truly *other* remaining top-level fields
      ...otherTopLevelData
  } = mappedPreviewData && typeof mappedPreviewData === 'object' ? mappedPreviewData : {};

  // --- DEBUGGING --- 
  
  // --- END DEBUGGING ---

  // --- Prepare Data Sections ---

  // 1. Basic Info
  const hasBasicInfo = title || status || bodyHtml;

  // 2. Details
  const detailsItems = createDescriptionListItems({ vendor, productType, handle });

  // 3. Tags
  const displayTags = useMemo(() => {
      if (Array.isArray(tags)) {
          return tags.filter(tag => tag && String(tag).trim()); // Filter empty tags
      } else if (typeof tags === 'string' && tags.trim() !== '') {
          return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
      return [];
  }, [tags]);

  // 4. Inventory & Pricing
  const inventoryData = inventoryItem || {};
  const inventoryPriceItems = createDescriptionListItems({
      price: inventoryData.price,
      compareAtPrice: inventoryData.compareAtPrice,
      cost: inventoryData.cost, // Added Cost
      sku: inventoryData.sku,
      barcode: inventoryData.barcode,
  });
  const inventoryStockItems = createDescriptionListItems({
      inventoryQuantity: inventoryData.inventoryQuantity,
      inventoryPolicy: inventoryData.inventoryPolicy,
      inventoryManagement: inventoryData.inventoryManagement,
  });

  // 5. Shipping & Weight
  const shippingWeightItems = createDescriptionListItems({
      weight: inventoryData.weight,
      weightUnit: inventoryData.weightUnit,
      requiresShipping: inventoryData.requiresShipping, // Added Requires Shipping
      harmonizedSystemCode: inventoryData.harmonizedSystemCode, // Added HS Code
  });

  // 6. Tax
  const taxItems = createDescriptionListItems({
      taxable: inventoryData.taxable, // Added Taxable
      taxCode: inventoryData.taxCode, // Added Tax Code
  });

  // 7. SEO
  const seoData = seo || {};
  const seoItems = createDescriptionListItems({
      title: seoData.title,
      description: seoData.description
  });

  // 8. Metafields (Grouped)
  const groupedMetafields = useMemo(() => {
    if (!metafields || !Array.isArray(metafields) || metafields.length === 0) return {};
    return metafields.reduce((acc, mf) => {
        // Basic validation of metafield structure
        if (mf && typeof mf === 'object' && mf.key && mf.namespace) {
            const ns = mf.namespace || 'custom'; // Default namespace if missing
            if (!acc[ns]) {
                acc[ns] = [];
            }
            acc[ns].push(mf);
        }
        return acc;
    }, {});
  }, [metafields]);
  const hasMetafields = Object.keys(groupedMetafields).length > 0;

  // 9. Other Data
  const otherDataItems = createDescriptionListItems({
      publishedAt, // Added Published At
      requiresSellingPlan, // Added Selling Plan
      templateSuffix, // Added Template Suffix
      ...otherTopLevelData // Include truly other fields
  });

  // Determine Badge tone based on status
  let statusTone;
  switch (String(status).toLowerCase()) {
      case 'active': statusTone = 'success'; break;
      case 'archived': statusTone = 'critical'; break; // Changed to critical for archived
      case 'draft':
      default: statusTone = 'attention'; break;
  }

  // Determine if there's *any* structured content to display
  const hasDisplayableContent = hasBasicInfo || detailsItems.length > 0 || displayTags.length > 0 ||
                              inventoryPriceItems.length > 0 || inventoryStockItems.length > 0 ||
                              shippingWeightItems.length > 0 || taxItems.length > 0 || seoItems.length > 0 ||
                              hasMetafields || otherDataItems.length > 0;

  return (
    <BlockStack gap="500">
      <Text variant="headingMd" as="h2">
        {stepTitle}
      </Text>
      <Text as="p" tone="subdued">
        Preview the simulated Shopify product data based on your mapping.
        {isArray && totalItems > 0 && (
          ` Showing product ${currentPreviewIndex + 1} of ${totalItems}.`
        )}
        {!isArray && totalItems === 1 && (
          ' Source data is a single object.'
        )}
        {totalItems === 0 && (
          ' No products found in the processed data to preview.'
        )}
      </Text>

      {/* Add the navigation controls at the top if there are multiple items */}
      {canNavigate && (
        <Box paddingBlockStart="200" paddingBlockEnd="200">
          <InlineStack align="center" gap="400">
            <Text as="span" variant="headingSm" fontWeight="medium">Browse Products:</Text>
            <ButtonGroup>
              <Button
                icon={ChevronLeftIcon}
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                accessibilityLabel="Previous product"
              >
                Previous
              </Button>
              <Button
                icon={ChevronRightIcon}
                iconPosition="end"
                onClick={handleNext}
                disabled={!canGoNext}
                accessibilityLabel="Next product"
              >
                Next
              </Button>
            </ButtonGroup>
            {totalItems > 0 && (
              <Text as="span" tone="subdued">
                {`Product ${currentPreviewIndex + 1} / ${totalItems}`}
              </Text>
            )}
          </InlineStack>
        </Box>
      )}

      <Divider />

      {totalItems > 0 && mappedPreviewData && (
        // Use padding on the Card itself
        <Card padding="0">
            {/* Error/Info Banners - Place *inside* Card but outside sections */}
            {mappingError && (
              <Box padding="400" background="bg-surface-critical-subdued" borderBottomWidth="025" borderColor="border">
                 <Text tone="critical" variant="bodyMd">Error during mapping: {mappingError}</Text>
              </Box>
            )}
            {mappingInfo && !mappingError && (
                <Box padding="400" background="bg-surface-secondary" borderBottomWidth="025" borderColor="border">
                    <Text tone="subdued" variant="bodyMd">{mappingInfo}</Text>
                </Box>
            )}

            {/* Render Product-like Preview only if no error/info or if content exists */}
            {(!mappingError && !mappingInfo && hasDisplayableContent) ? (
                <BlockStack gap="0"> {/* Remove gap here, let Card.Section handle spacing */}
                    {/* --- Section: Basic Info --- */}
                    {hasBasicInfo && (
                        <Box padding="400"> {/* Removed borderBottomWidth */}
                            <BlockStack gap="200">
                                <InlineStack gap="200" align="start" blockAlign="center" wrap={false}>
                                    {title ? (
                                        <Text variant="headingLg" as="h3">{renderValue(title)}</Text>
                                    ) : (
                                        <Text variant="headingLg" as="h3" tone="subdued">_No Title Mapped_</Text>
                                    )}
                                    {status && <Badge tone={statusTone}>{renderValue(status)}</Badge>}
                                </InlineStack>
                                {bodyHtml ? (
                                    // Use TextContainer for potentially longer descriptions
                                    <Text as="p" variant="bodyMd">{renderValue(bodyHtml)}</Text>
                                ) : (
                                    <Text as="p" tone="subdued" variant="bodyMd">_No description mapped or available_</Text>
                                )}
                            </BlockStack>
                        </Box>
                    )}

                    {/* --- Divider if needed --- */}
                    {hasBasicInfo && (detailsItems.length > 0 || displayTags.length > 0 || inventoryPriceItems.length > 0 || inventoryStockItems.length > 0 || shippingWeightItems.length > 0 || taxItems.length > 0 || seoItems.length > 0 || hasMetafields || otherDataItems.length > 0) && <Divider />}

                    {/* --- Section: Details --- */}
                    {detailsItems.length > 0 && (
                        <Box padding="400"> {/* Removed borderBottomWidth */}
                            <BlockStack gap="200">
                                <Text variant="headingMd" as="h3">Details</Text>
                                <DescriptionList items={detailsItems} />
                            </BlockStack>
                        </Box>
                    )}

                    {/* --- Divider if needed --- */}
                    {detailsItems.length > 0 && (displayTags.length > 0 || inventoryPriceItems.length > 0 || inventoryStockItems.length > 0 || shippingWeightItems.length > 0 || taxItems.length > 0 || seoItems.length > 0 || hasMetafields || otherDataItems.length > 0) && <Divider />}

                    {/* --- Section: Tags --- */}
                    {displayTags.length > 0 && (
                        <Box padding="400"> {/* Removed borderBottomWidth */}
                            <BlockStack gap="200">
                                <Text variant="headingMd" as="h3">Tags</Text>
                                <InlineStack gap="200" wrap={true}>
                                    {displayTags.map((tag, index) => <Tag key={index}>{renderValue(tag)}</Tag>)}
                                </InlineStack>
                            </BlockStack>
                        </Box>
                    )}

                    {/* --- Divider if needed --- */}
                    {displayTags.length > 0 && (inventoryPriceItems.length > 0 || inventoryStockItems.length > 0 || shippingWeightItems.length > 0 || taxItems.length > 0 || seoItems.length > 0 || hasMetafields || otherDataItems.length > 0) && <Divider />}

                    {/* --- Section: Pricing & Inventory --- */}
                    {(inventoryPriceItems.length > 0 || inventoryStockItems.length > 0) && (
                        <Box padding="400"> {/* Removed borderBottomWidth */}
                            <BlockStack gap="200">
                                <Text variant="headingMd" as="h3">Pricing & Inventory</Text>
                                <BlockStack gap="400">
                                    {inventoryPriceItems.length > 0 && <DescriptionList items={inventoryPriceItems} />}
                                    {inventoryStockItems.length > 0 && <DescriptionList items={inventoryStockItems} />}
                                </BlockStack>
                            </BlockStack>
                        </Box>
                    )}

                    {/* --- Divider if needed --- */}
                    {(inventoryPriceItems.length > 0 || inventoryStockItems.length > 0) && (shippingWeightItems.length > 0 || taxItems.length > 0 || seoItems.length > 0 || hasMetafields || otherDataItems.length > 0) && <Divider />}

                    {/* --- Section: Shipping & Weight --- */}
                    {shippingWeightItems.length > 0 && (
                        <Box padding="400"> {/* Removed borderBottomWidth */}
                            <BlockStack gap="200">
                                <Text variant="headingMd" as="h3">Shipping & Weight</Text>
                                <DescriptionList items={shippingWeightItems} />
                            </BlockStack>
                        </Box>
                    )}

                    {/* --- Divider if needed --- */}
                    {shippingWeightItems.length > 0 && (taxItems.length > 0 || seoItems.length > 0 || hasMetafields || otherDataItems.length > 0) && <Divider />}

                    {/* --- Section: Tax --- */}
                    {taxItems.length > 0 && (
                        <Box padding="400"> {/* Removed borderBottomWidth */}
                            <BlockStack gap="200">
                                <Text variant="headingMd" as="h3">Tax</Text>
                                <DescriptionList items={taxItems} />
                            </BlockStack>
                        </Box>
                    )}

                    {/* --- Divider if needed --- */}
                    {taxItems.length > 0 && (seoItems.length > 0 || hasMetafields || otherDataItems.length > 0) && <Divider />}

                    {/* --- Section: SEO --- */}
                    {seoItems.length > 0 && (
                        <Box padding="400"> {/* Removed borderBottomWidth */}
                            <BlockStack gap="200">
                                <Text variant="headingMd" as="h3">Search Engine Listing</Text>
                                <DescriptionList items={seoItems} />
                            </BlockStack>
                        </Box>
                    )}

                    {/* --- Divider if needed --- */}
                    {seoItems.length > 0 && (hasMetafields || otherDataItems.length > 0) && <Divider />}

                    {/* --- Section: Metafields --- */}
                    {hasMetafields && (
                        <Box padding="400"> {/* Removed borderBottomWidth */}
                            <BlockStack gap="200">
                                <Text variant="headingMd" as="h3">Metafields ({metafields.length})</Text>
                                <BlockStack gap="400">
                                    {Object.entries(groupedMetafields).map(([namespace, mfs]) => (
                                        <BlockStack key={namespace} gap="100">
                                            {/* Use a smaller heading for namespace */}
                                            <Text variant="headingSm" as="h4">{namespace}</Text>
                                            {/* Indent the list slightly */}
                                            <Box paddingInlineStart="200">
                                                <DescriptionList
                                                    items={mfs.map((mf, idx) => ({
                                                        term: mf.key || `field_${idx}`, // Fallback term
                                                        description: (
                                                            <BlockStack gap="0">
                                                                <Text as="span" variant="bodyMd">{renderValue(mf.value)}</Text>
                                                                {mf.type && (
                                                                    <Text as="span" tone="subdued" variant="bodySm">({renderValue(mf.type)})</Text>
                                                                )}
                                                            </BlockStack>
                                                        )
                                                    }))}
                                                />
                                            </Box>
                                        </BlockStack>
                                    ))}
                                </BlockStack>
                            </BlockStack>
                        </Box>
                    )}

                    {/* --- Divider if needed --- */}
                    {hasMetafields && otherDataItems.length > 0 && <Divider />}

                    {/* --- Section: Other Data --- */}
                    {otherDataItems.length > 0 && (
                        <Box padding="400"> {/* This box never had a border */}
                            <BlockStack gap="200">
                                <Text variant="headingMd" as="h3">Other Data</Text>
                                <DescriptionList items={otherDataItems} />
                            </BlockStack>
                        </Box>
                    )}
                </BlockStack>
            ) : (
                 /* Fallback message if no displayable content AND no error/info */
                 !mappingError && !mappingInfo && (
                     <Box padding="400">
                         <Text tone="subdued" alignment='center'>No mappable data fields found or mapped for this item.</Text>
                     </Box>
                )
            )}
        </Card>
      )}

      {/* Keep the bottom navigation buttons for convenience */}
      {canNavigate && (
        <InlineStack align="center" gap="400">
          <ButtonGroup>
            <Button
              icon={ChevronLeftIcon}
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              accessibilityLabel="Previous product"
            />
            <Button
              icon={ChevronRightIcon}
              onClick={handleNext}
              disabled={!canGoNext}
              accessibilityLabel="Next product"
            />
          </ButtonGroup>
          {totalItems > 0 && (
            <Text as="span" tone="subdued">
              {`Product ${currentPreviewIndex + 1} / ${totalItems}`}
            </Text>
          )}
        </InlineStack>
      )}
    </BlockStack>
  );
}

export default WizardStepPreview; 