import {
  BlockStack,
  FormLayout,
  Select,
  Text,
  Banner,
  InlineStack,
  Button,
  Popover,
  ActionList,
  Tooltip,
  InlineGrid,
  Badge,
  Scrollable,
  Box,
  Icon,
  Card,
  TextField,
} from '@shopify/polaris'
import {
  PlusCircleIcon,
  MinusCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  DeleteIcon,
} from '@shopify/polaris-icons'
import { useState, useCallback, useMemo, useEffect } from 'react'

// Helper function for truncation
const truncateString = (str, num) => {
  if (str === null || str === undefined) return '';
  const stringified = String(str); // Convert boolean/number/null/undefined to string
  if (stringified.length <= num) {
    return stringified;
  }
  return stringified.slice(0, num) + '...';
};

// Define common metafield types
const METAFIELD_TYPES = [
  { label: 'Single line text', value: 'single_line_text_field' },
  { label: 'Multi line text', value: 'multi_line_text_field' },
  { label: 'JSON String', value: 'json_string' },
  { label: 'Integer', value: 'number_integer' },
  { label: 'Decimal', value: 'number_decimal' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'URL', value: 'url' },
  { label: 'Date', value: 'date' },
  { label: 'Date & Time', value: 'date_time' },
  { label: 'List: Single line text', value: 'list.single_line_text_field' },
  // Add more list types if needed (e.g., list.number_integer)
];

// --- Helper to get keys from the first object in an array ---
const getKeysFromFirstObjectInArray = (data) => {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
    return Object.keys(data[0]).map(key => ({ label: key, value: key }));
  }
  return [];
};

// --- Helper to check if data is an array of objects ---
const isArrayOfObjects = (data) => {
   return Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null;
}

/**
 * Renders the UI for the "Mapping" step.
 * @param {{
 *  stepTitle: string,
 *  // Required field
 *  titleKey: string,
 *  setTitleKey: (value: string) => void,
 *  titleKeyId: string,
 *  // Optional fields management
 *  optionalFieldKeys: Record<string, string>,
 *  setOptionalFieldKeys: (updater: (prev: Record<string, string>) => Record<string, string>) => void,
 *  activeOptionalFields: string[],
 *  setActiveOptionalFields: (updater: (prev: string[]) => string[]) => void,
 *  // Metafield mapping management
 *  metafieldMappings: {id: string, mappingType: 'single' | 'dynamic_from_array', sourceKey: string, metafieldNamespace: string, metafieldKey: string, metafieldType: string, arrayKeySource?: string, arrayValueSource?: string}[],
 *  setMetafieldMappings: (updater: (prev: any[]) => any[]) => void,
 *  // Field Constants
 *  fieldConstants: Record<string, string>,
 *  // Other necessary props
 *  mappingOptions: {label: string, value: string}[],
 *  remoteData: any // Used to check if data was fetched
 *  processedPreviewData: object | null // The actual data object for value preview
 * }} props
 */
function WizardStepMapping({
  stepTitle,
  // Required
  titleKey,
  setTitleKey,
  titleKeyId,
  // Optional fields
  optionalFieldKeys,
  setOptionalFieldKeys,
  activeOptionalFields,
  setActiveOptionalFields,
  // Metafield mappings
  metafieldMappings,
  setMetafieldMappings,
  // Constants & Data
  fieldConstants, // Contains keys like FIELD_VENDOR, FIELD_SEO_TITLE etc.
  mappingOptions,
  remoteData,
  processedPreviewData,
}) {

  // --- Popover State (Optional Fields) ---
  const [popoverActive, setPopoverActive] = useState(false);
  const togglePopoverActive = useCallback(() => setPopoverActive((active) => !active), []);

  // --- Metafield Add Form State ---
  const [showAddMetafieldForm, setShowAddMetafieldForm] = useState(false);
  const [addFormMappingType, setAddFormMappingType] = useState('single'); // 'single' or 'dynamic_from_array'
  const [newMetafieldSourceKey, setNewMetafieldSourceKey] = useState('');
  const [newMetafieldNamespace, setNewMetafieldNamespace] = useState('custom');
  const [newMetafieldKey, setNewMetafieldKey] = useState(''); // Used for single or as base/prefix for dynamic
  const [newMetafieldType, setNewMetafieldType] = useState(METAFIELD_TYPES[0].value);
  // State for dynamic mapping type
  const [newArrayKeySource, setNewArrayKeySource] = useState('');
  const [newArrayValueSource, setNewArrayValueSource] = useState('');
  const [arrayObjectKeys, setArrayObjectKeys] = useState([]); // Options for key/value source dropdowns

  // --- Effect to check selected source data type ---
  useEffect(() => {
    if (newMetafieldSourceKey && processedPreviewData) {
      const selectedData = processedPreviewData[newMetafieldSourceKey];
      if (isArrayOfObjects(selectedData)) {
        setAddFormMappingType('dynamic_from_array');
        const keys = getKeysFromFirstObjectInArray(selectedData);
        setArrayObjectKeys(keys);
        // Reset dynamic fields if they are no longer valid options
        if (keys.length > 0) {
            if (newArrayKeySource && !keys.find(k => k.value === newArrayKeySource)) {
                setNewArrayKeySource('');
            }
            if (newArrayValueSource && !keys.find(k => k.value === newArrayValueSource)) {
                setNewArrayValueSource('');
            }
        } else {
             setNewArrayKeySource('');
             setNewArrayValueSource('');
        }

      } else {
        setAddFormMappingType('single');
        setArrayObjectKeys([]);
        setNewArrayKeySource(''); // Reset dynamic fields
        setNewArrayValueSource('');
      }
    } else {
      // Reset if no source key selected or no data
      setAddFormMappingType('single');
      setArrayObjectKeys([]);
      setNewArrayKeySource('');
      setNewArrayValueSource('');
    }
  }, [newMetafieldSourceKey, processedPreviewData]);

  // --- Optional Field Configuration ---
  const allOptionalFieldsConfig = useMemo(() => {
    // Helper to create setter for a specific optional field key
    const createSetter = (fieldConst) => (value) => {
      setOptionalFieldKeys(prev => ({ ...prev, [fieldConst]: value }));
    };

    // Define labels and help text for each field
    return {
      // [fieldConstants.FIELD_ID]: { label: 'Product ID (for updates)', setter: createSetter(fieldConstants.FIELD_ID), id: 'idKey', helpText: 'Map to the existing Shopify Product ID (GID) if updating.' }, // Removed
      [fieldConstants.FIELD_DESCRIPTION_HTML]: { label: 'Description (HTML)', setter: createSetter(fieldConstants.FIELD_DESCRIPTION_HTML), id: 'descriptionHtmlKey', helpText: 'Map to the product description (HTML is supported).' },
      [fieldConstants.FIELD_VENDOR]: { label: 'Vendor', setter: createSetter(fieldConstants.FIELD_VENDOR), id: 'vendorKey', helpText: 'Map to the brand or vendor name.' },
      [fieldConstants.FIELD_HANDLE]: { label: 'Handle', setter: createSetter(fieldConstants.FIELD_HANDLE), id: 'handleKey', helpText: 'Map to the unique URL handle (e.g., product-name).' },
      [fieldConstants.FIELD_PRODUCT_TYPE]: { label: 'Product Type', setter: createSetter(fieldConstants.FIELD_PRODUCT_TYPE), id: 'productTypeKey', helpText: 'Map to product type (e.g., T-Shirt, Mug).' },
      [fieldConstants.FIELD_TAGS]: { label: 'Tags', setter: createSetter(fieldConstants.FIELD_TAGS), id: 'tagsKey', helpText: 'Map to a comma-separated list or array of tags.' },
      [fieldConstants.FIELD_STATUS]: { label: 'Status', setter: createSetter(fieldConstants.FIELD_STATUS), id: 'statusKey', helpText: 'Map to product status (ACTIVE, ARCHIVED, DRAFT).' },
      [fieldConstants.FIELD_SEO_TITLE]: { label: 'SEO Title', setter: createSetter(fieldConstants.FIELD_SEO_TITLE), id: 'seoTitleKey', helpText: 'Map to the search engine title.' },
      [fieldConstants.FIELD_SEO_DESCRIPTION]: { label: 'SEO Description', setter: createSetter(fieldConstants.FIELD_SEO_DESCRIPTION), id: 'seoDescriptionKey', helpText: 'Map to the search engine description.' },
      [fieldConstants.FIELD_PUBLISHED_AT]: { label: 'Published At', setter: createSetter(fieldConstants.FIELD_PUBLISHED_AT), id: 'publishedAtKey', helpText: 'Map to the publication date/time (ISO 8601 format).' },
      [fieldConstants.FIELD_REQUIRES_SELLING_PLAN]: { label: 'Requires Selling Plan', setter: createSetter(fieldConstants.FIELD_REQUIRES_SELLING_PLAN), id: 'requiresSellingPlanKey', helpText: 'Map to a boolean (true/false) indicating if a selling plan is required.' },
      [fieldConstants.FIELD_TEMPLATE_SUFFIX]: { label: 'Template Suffix', setter: createSetter(fieldConstants.FIELD_TEMPLATE_SUFFIX), id: 'templateSuffixKey', helpText: 'Map to the theme template suffix.' },

      // --- Fields previously under Variant (now flat) ---
      [fieldConstants.FIELD_SKU]: { label: 'SKU', setter: createSetter(fieldConstants.FIELD_SKU), id: 'skuKey', helpText: 'Map to the Stock Keeping Unit.' },
      [fieldConstants.FIELD_BARCODE]: { label: 'Barcode', setter: createSetter(fieldConstants.FIELD_BARCODE), id: 'barcodeKey', helpText: 'Map to the barcode (UPC, EAN, ISBN).' },
      [fieldConstants.FIELD_PRICE]: { label: 'Price', setter: createSetter(fieldConstants.FIELD_PRICE), id: 'priceKey', helpText: 'Map to the selling price.' },
      [fieldConstants.FIELD_COMPARE_AT_PRICE]: { label: 'Compare At Price', setter: createSetter(fieldConstants.FIELD_COMPARE_AT_PRICE), id: 'compareAtPriceKey', helpText: 'Map to the original price before discount.' },
      [fieldConstants.FIELD_WEIGHT]: { label: 'Weight', setter: createSetter(fieldConstants.FIELD_WEIGHT), id: 'weightKey', helpText: 'Map to the product weight (numeric value).' },
      [fieldConstants.FIELD_WEIGHT_UNIT]: { label: 'Weight Unit', setter: createSetter(fieldConstants.FIELD_WEIGHT_UNIT), id: 'weightUnitKey', helpText: 'Map to the weight unit (KILOGRAMS, GRAMS, POUNDS, OUNCES).' },
      [fieldConstants.FIELD_INVENTORY_POLICY]: { label: 'Inventory Policy', setter: createSetter(fieldConstants.FIELD_INVENTORY_POLICY), id: 'inventoryPolicyKey', helpText: 'Map to DENY or CONTINUE selling when out of stock.' },
      [fieldConstants.FIELD_INVENTORY_QUANTITY]: { label: 'Inventory Quantity', setter: createSetter(fieldConstants.FIELD_INVENTORY_QUANTITY), id: 'inventoryQuantityKey', helpText: 'Map to the available stock quantity.' },
      [fieldConstants.FIELD_INVENTORY_MANAGEMENT]: { label: 'Inventory Management', setter: createSetter(fieldConstants.FIELD_INVENTORY_MANAGEMENT), id: 'inventoryManagementKey', helpText: 'Map to SHOPIFY, NOT_MANAGED, or FULFILLMENT_SERVICE.' },
      [fieldConstants.FIELD_TAXABLE]: { label: 'Taxable', setter: createSetter(fieldConstants.FIELD_TAXABLE), id: 'taxableKey', helpText: 'Map to a boolean (true/false) indicating if the product is taxable.' },
      [fieldConstants.FIELD_TAX_CODE]: { label: 'Tax Code', setter: createSetter(fieldConstants.FIELD_TAX_CODE), id: 'taxCodeKey', helpText: 'Map to a tax code (e.g., for Avalara).' },
      [fieldConstants.FIELD_HARMONIZED_SYSTEM_CODE]: { label: 'HS Code', setter: createSetter(fieldConstants.FIELD_HARMONIZED_SYSTEM_CODE), id: 'harmonizedSystemCodeKey', helpText: 'Map to the Harmonized System code for customs.' },
      [fieldConstants.FIELD_REQUIRES_SHIPPING]: { label: 'Requires Shipping', setter: createSetter(fieldConstants.FIELD_REQUIRES_SHIPPING), id: 'requiresShippingKey', helpText: 'Map to a boolean (true/false) indicating if shipping is required.' },
      [fieldConstants.FIELD_COST]: { label: 'Cost of Goods', setter: createSetter(fieldConstants.FIELD_COST), id: 'costKey', helpText: 'Map to the cost of the item (inventoryItem.cost).' },

      // --- Removed List Fields ---
      // [fieldConstants.FIELD_PRODUCT_OPTIONS]: { label: 'Product Options (List)', setter: createSetter(fieldConstants.FIELD_PRODUCT_OPTIONS), id: 'productOptionsKey', helpText: 'Map to the field containing the list of product options.' },
      // [fieldConstants.FIELD_VARIANTS]: { label: 'Variants (List)', setter: createSetter(fieldConstants.FIELD_VARIANTS), id: 'variantsKey', helpText: 'Map to the field containing the list of product variants.' },
      // [fieldConstants.FIELD_METAFIELDS]: { label: 'Metafields (List)', setter: createSetter(fieldConstants.FIELD_METAFIELDS), id: 'metafieldsKey', helpText: 'Map to the field containing the list of metafields.' },
      // [fieldConstants.FIELD_IMAGES]: { label: 'Images (List)', setter: createSetter(fieldConstants.FIELD_IMAGES), id: 'imagesKey', helpText: 'Map to the field containing the list of product images.' },
      // [fieldConstants.FIELD_FILES]: { label: 'Files (List)', setter: createSetter(fieldConstants.FIELD_FILES), id: 'filesKey', helpText: 'Map to the field containing the list of associated files.' },
      // [fieldConstants.FIELD_COLLECTIONS_TO_JOIN]: { label: 'Collections to Join (List)', setter: createSetter(fieldConstants.FIELD_COLLECTIONS_TO_JOIN), id: 'collectionsToJoinKey', helpText: 'Map to a list of Collection IDs to add the product to.' },
      // [fieldConstants.FIELD_COLLECTIONS_TO_LEAVE]: { label: 'Collections to Leave (List)', setter: createSetter(fieldConstants.FIELD_COLLECTIONS_TO_LEAVE), id: 'collectionsToLeaveKey', helpText: 'Map to a list of Collection IDs to remove the product from.' }, // Removed
    };
  }, [fieldConstants, setOptionalFieldKeys]);

  // --- Field Add/Remove Logic (Optional Fields) ---
  const handleAddField = useCallback((fieldKey) => {
    setActiveOptionalFields(prev => [...prev, fieldKey]);
    setPopoverActive(false);
  }, [setActiveOptionalFields]);

  const handleRemoveField = useCallback((fieldKeyToRemove) => {
    // Reset the mapped key for this field
    setOptionalFieldKeys(prev => ({ ...prev, [fieldKeyToRemove]: '' }));
    // Remove from active fields
    setActiveOptionalFields(prev => prev.filter(key => key !== fieldKeyToRemove));
  }, [setActiveOptionalFields, setOptionalFieldKeys]);

  // --- Fields available to be added (Optional Fields) ---
  const availableFieldsToAdd = useMemo(() => Object.entries(allOptionalFieldsConfig)
    .filter(([key]) => !activeOptionalFields.includes(key))
    .map(([key, { label, helpText }]) => ({
      // Wrap the content (label) with a Tooltip displaying the helpText
      content: (
        <Tooltip content={helpText} dismissOnMouseOut>
          {/* Apply styles to make the span fill the available width */}
          <span style={{ display: 'block', width: '100%' }}>{label}</span>
        </Tooltip>
      ),
      onAction: () => handleAddField(key),
    })),
    [activeOptionalFields, allOptionalFieldsConfig, handleAddField]);

  // --- Metafield Add/Remove Logic ---
  const handleAddMetafieldMapping = useCallback(() => {
    // Base validation
    if (!newMetafieldSourceKey || !newMetafieldNamespace || !newMetafieldType) {
      console.warn("Please fill required metafield mapping fields.");
      return;
    }

    let newMapping = {
      id: Date.now().toString(),
      mappingType: addFormMappingType,
      sourceKey: newMetafieldSourceKey,
      metafieldNamespace: newMetafieldNamespace,
      metafieldType: newMetafieldType,
      // Always include these, they might be empty if type is 'single'
      metafieldKey: newMetafieldKey, // For single, this is the target key. For dynamic, maybe a prefix or unused.
      arrayKeySource: newArrayKeySource,
      arrayValueSource: newArrayValueSource,
    };

    // Type-specific validation
    if (addFormMappingType === 'single' && !newMetafieldKey) {
      console.warn("Metafield Key is required for single mapping type.");
      return;
    }
    if (addFormMappingType === 'dynamic_from_array' && (!newArrayKeySource || !newArrayValueSource)) {
      console.warn("Key Source and Value Source are required for dynamic array mapping.");
      return;
    }

    setMetafieldMappings(prev => [...prev, newMapping]);

    // Reset form and hide
    setShowAddMetafieldForm(false);
    setNewMetafieldSourceKey('');
    setNewMetafieldNamespace('custom');
    setNewMetafieldKey('');
    setNewMetafieldType(METAFIELD_TYPES[0].value);
    setNewArrayKeySource('');
    setNewArrayValueSource('');
    setAddFormMappingType('single'); // Reset form type
    setArrayObjectKeys([]);

  }, [
    addFormMappingType,
    newMetafieldSourceKey,
    newMetafieldNamespace,
    newMetafieldKey,
    newMetafieldType,
    newArrayKeySource,
    newArrayValueSource,
    setMetafieldMappings,
  ]);

  const handleRemoveMetafieldMapping = useCallback((idToRemove) => {
    setMetafieldMappings(prev => prev.filter(mapping => mapping.id !== idToRemove));
  }, [setMetafieldMappings]);

  // --- Calculate currently used source keys (including metafields) ---
  const mappedSourceKeys = useMemo(() => {
    const keys = new Set();
    if (titleKey) {
      keys.add(titleKey);
    }
    activeOptionalFields.forEach(fieldKey => {
      const mappedKey = optionalFieldKeys[fieldKey];
      if (mappedKey) {
        keys.add(mappedKey);
      }
    });
    metafieldMappings.forEach(mapping => {
      if (mapping.sourceKey) {
        keys.add(mapping.sourceKey);
      }
    });
    return keys;
  }, [titleKey, activeOptionalFields, optionalFieldKeys, metafieldMappings]);

  // --- Reset Add Metafield Form ---
  const resetAddMetafieldForm = () => {
     setShowAddMetafieldForm(false);
     setNewMetafieldSourceKey('');
     setNewMetafieldNamespace('custom');
     setNewMetafieldKey('');
     setNewMetafieldType(METAFIELD_TYPES[0].value);
     setNewArrayKeySource('');
     setNewArrayValueSource('');
     setAddFormMappingType('single');
     setArrayObjectKeys([]);
  }

  // --- Render ---
  return (
    <BlockStack gap="400" inlineAlign="start">
      <div style={{ padding: 'var(--p-space-400)' }}>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            {stepTitle}
          </Text>
          <FormLayout>
            <Text variant="bodyMd" as="p" tone="subdued">
              Map the fields from your data source to the corresponding Shopify
              product fields. The 'Product Title' is required. Use the buttons
              below to add optional standard fields or custom metafield mappings.
              The list on the right shows available source fields and their mapped status.
            </Text>
          </FormLayout>

          {mappingOptions.length === 0 ? (
            <Banner status="warning" tone="warning">
              {remoteData === null
                ? 'Go back to the Connection step and test/fetch data first.'
                : "No mappable fields found in the data at the specified path. Check the 'Data Path' in the Connection step or the structure of your source file."}
            </Banner>
          ) : (
            // Use InlineGrid for two columns
            <InlineGrid columns={{ xs: 1, md: '2fr 1fr' }} gap="400">
              {/* Left Column: Mapping Selects & Metafields */}
              <BlockStack gap="500"> {/* Increased gap */} 
                  {/* === Standard Fields === */}
                  <Card roundedAbove="sm">
                    <BlockStack gap="400">
                      <Box padding="400">
                        <Text variant="headingSm" as="h3">Standard Product Fields</Text>
                      </Box>
                      <Box paddingInlineStart="400" paddingInlineEnd="400" paddingBlockEnd="400">
                        <BlockStack gap="400">
                          {/* Required Field: Title */}
                          <div style={{ maxWidth: '400px' }}>
                            <Select
                              id={titleKeyId}
                              label="Product Title (Required)"
                              options={mappingOptions}
                              value={titleKey || ''}
                              onChange={setTitleKey}
                              helpText="Select the field containing the product name."
                            />
                          </div>

                          {/* Divider */}
                          <hr style={{ border: 'none', borderTop: '1px solid var(--p-color-border)', margin: '0' }} />

                          {/* Active Optional Fields */}
                          {activeOptionalFields.map((fieldKey) => {
                            const fieldConfig = allOptionalFieldsConfig[fieldKey];
                            if (!fieldConfig) return null;
                            const currentMappedKey = optionalFieldKeys[fieldKey];

                            return (
                              <div key={fieldKey} style={{ maxWidth: '400px' }}>
                                <InlineStack gap="200" wrap={false} blockAlign="end">
                                  <div style={{ flexGrow: 1 }}>
                                    <Select
                                      id={fieldConfig.id}
                                      label={fieldConfig.label}
                                      options={mappingOptions}
                                      value={currentMappedKey || ''}
                                      onChange={fieldConfig.setter}
                                      helpText={fieldConfig.helpText}
                                    />
                                  </div>
                                  <div style={{ paddingBottom: fieldConfig.helpText ? 'var(--p-space-500)' : '0' }}>
                                    <Button
                                      icon={MinusCircleIcon}
                                      onClick={() => handleRemoveField(fieldKey)}
                                      accessibilityLabel={`Remove ${fieldConfig.label} field`}
                                      variant='tertiary'
                                      tone='critical'
                                    />
                                  </div>
                                </InlineStack>
                              </div>
                            );
                          })}

                          {/* Add Optional Field Button/Popover */}
                          {availableFieldsToAdd.length > 0 && (
                            <div style={{ marginTop: 'var(--p-space-200)' }}>
                              <Popover
                                active={popoverActive}
                                activator={
                                  <Button
                                    icon={PlusCircleIcon}
                                    variant='secondary'
                                    onClick={togglePopoverActive}
                                    disclosure
                                  >
                                    Add Optional Field
                                  </Button>
                                }
                                autofocusTarget="first-node"
                                onClose={togglePopoverActive}
                              >
                                <ActionList
                                  actionRole="menuitem"
                                  items={availableFieldsToAdd}
                                />
                              </Popover>
                            </div>
                          )}
                        </BlockStack>
                      </Box>
                    </BlockStack>
                  </Card>

                  {/* === Metafield Mappings === */}
                  <Card roundedAbove="sm">
                    <BlockStack gap="400">
                      <Box padding="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="headingSm" as="h3">Metafield Mappings</Text>
                          {!showAddMetafieldForm && (
                            <Button
                              icon={PlusCircleIcon}
                              onClick={() => setShowAddMetafieldForm(true)}
                              size="slim"
                            >
                              Add Metafield Mapping
                            </Button>
                          )}
                        </InlineStack>
                      </Box>

                      {/* Display Existing Metafield Mappings */}
                      {metafieldMappings.length > 0 && (
                        <Box paddingInlineStart="400" paddingInlineEnd="400" paddingBlockEnd={showAddMetafieldForm ? '0' : '400'}>
                          <BlockStack gap="300">
                            {metafieldMappings.map((mapping) => (
                              <Box key={mapping.id} padding="200" background="bg-surface-secondary" borderRadius="100">
                                <InlineStack wrap={false} gap="400" blockAlign="center" align="space-between">
                                  <BlockStack gap="100" >
                                      <InlineStack gap="200" wrap={false}>
                                          <Text variant="bodySm" as="span" tone="subdued">Source:</Text>
                                          <Text variant="bodyMd" as="span" fontWeight="medium">{mapping.sourceKey || '[Not Selected]'}</Text>
                                      </InlineStack>
                                      {/* Target Info - Conditional Display */}
                                      {mapping.mappingType === 'dynamic_from_array' ? (
                                        <>
                                          <InlineStack gap="200" wrap={false}>
                                              <Text variant="bodySm" as="span" tone="subdued">Target:</Text>
                                              <Text variant="bodyMd" as="span" fontWeight="medium">
                                                  {`${mapping.metafieldNamespace}.[${mapping.arrayKeySource}]`}
                                              </Text>
                                          </InlineStack>
                                           <InlineStack gap="200" wrap={false}>
                                              <Text variant="bodySm" as="span" tone="subdued">Value Src:</Text>
                                              <Text variant="bodyMd" as="span" fontWeight="medium">
                                                  {`[${mapping.arrayValueSource}]`}
                                              </Text>
                                          </InlineStack>
                                          <InlineStack gap="200" wrap={false}>
                                              <Text variant="bodySm" as="span" tone="subdued">Type (Default):</Text>
                                              <Text variant="bodyMd" as="span" fontWeight="medium">
                                                  {METAFIELD_TYPES.find(t => t.value === mapping.metafieldType)?.label || mapping.metafieldType}
                                              </Text>
                                          </InlineStack>
                                        </>
                                      ) : ( // Single mapping type
                                        <>
                                          <InlineStack gap="200" wrap={false}>
                                              <Text variant="bodySm" as="span" tone="subdued">Target:</Text>
                                              <Text variant="bodyMd" as="span" fontWeight="medium">
                                                  {`${mapping.metafieldNamespace}.${mapping.metafieldKey}`}
                                              </Text>
                                          </InlineStack>
                                          <InlineStack gap="200" wrap={false}>
                                              <Text variant="bodySm" as="span" tone="subdued">Type:</Text>
                                              <Text variant="bodyMd" as="span" fontWeight="medium">
                                                  {METAFIELD_TYPES.find(t => t.value === mapping.metafieldType)?.label || mapping.metafieldType}
                                              </Text>
                                          </InlineStack>
                                        </>
                                      )}
                                  </BlockStack>
                                  <Button
                                    icon={DeleteIcon}
                                    onClick={() => handleRemoveMetafieldMapping(mapping.id)}
                                    accessibilityLabel={`Remove metafield mapping for ${mapping.metafieldNamespace}.${mapping.metafieldKey}`}
                                    variant='tertiary'
                                    tone='critical'
                                    size="slim"
                                  />
                                </InlineStack>
                              </Box>
                            ))}
                          </BlockStack>
                        </Box>
                      )}
                      {metafieldMappings.length === 0 && !showAddMetafieldForm && (
                          <Box paddingInlineStart="400" paddingInlineEnd="400" paddingBlockEnd="400">
                             <Text variant="bodyMd" as="p" tone="subdued">No metafields mapped yet.</Text>
                          </Box>
                      )}

                      {/* Add Metafield Form */}
                      {showAddMetafieldForm && (
                        <Box padding="400" borderBlockStart="divider">
                          <FormLayout>
                            <Select
                              label="Source Field"
                              options={mappingOptions}
                              value={newMetafieldSourceKey}
                              onChange={setNewMetafieldSourceKey}
                              placeholder="Select source data field..."
                              helpText={addFormMappingType === 'dynamic_from_array' ? 'Detected array of objects. Specify key/value sources below.' : 'Select the source data field to map.'}
                            />
                            {/* Conditionally show dynamic fields */} 
                            {addFormMappingType === 'dynamic_from_array' && (
                                <>
                                    <Select
                                        label="Metafield Key Source"
                                        options={arrayObjectKeys} // Keys from within the array's objects
                                        value={newArrayKeySource}
                                        onChange={setNewArrayKeySource}
                                        placeholder="Select field for metafield key..."
                                        helpText="Field within each array object to use as the metafield key (e.g., prop_code)."
                                    />
                                    <Select
                                        label="Metafield Value Source"
                                        options={arrayObjectKeys} // Keys from within the array's objects
                                        value={newArrayValueSource}
                                        onChange={setNewArrayValueSource}
                                        placeholder="Select field for metafield value..."
                                        helpText="Field within each array object to use as the metafield value (e.g., prod_value)."
                                    />
                                </> 
                            )}
                            <TextField
                              label="Metafield Namespace"
                              value={newMetafieldNamespace}
                              onChange={setNewMetafieldNamespace}
                              helpText="e.g., custom, details, specifications"
                              autoComplete="off"
                            />
                             {/* Only show Metafield Key input for single mapping type */}
                            {addFormMappingType === 'single' && (
                                <TextField
                                    label="Metafield Key"
                                    value={newMetafieldKey}
                                    onChange={setNewMetafieldKey}
                                    helpText="e.g., material, ean_extras, model_codes"
                                    autoComplete="off"
                                />
                            )}
                            <Select
                              label={addFormMappingType === 'dynamic_from_array' ? "Default Metafield Type" : "Metafield Type"}
                              options={addFormMappingType === 'dynamic_from_array' 
                                        ? METAFIELD_TYPES.filter(t => !t.value.startsWith('list.')) // Exclude list types for dynamic 
                                        : METAFIELD_TYPES // Allow all for single
                                    }
                              value={newMetafieldType}
                              onChange={setNewMetafieldType}
                              helpText={addFormMappingType === 'dynamic_from_array' ? "Default type for dynamically created metafields." : "Select the target metafield type." }
                            />
                            {/* Future: Add Transformation Select here */}
                            <InlineStack gap="200">
                              <Button variant="primary" onClick={handleAddMetafieldMapping}>Add Mapping</Button>
                              <Button onClick={resetAddMetafieldForm}>Cancel</Button> {/* Use reset function */} 
                            </InlineStack>
                          </FormLayout>
                        </Box>
                      )}
                    </BlockStack>
                  </Card>
              </BlockStack>

              {/* Right Column: List of all mapping options */}
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">Available Source Fields</Text>
                <Box>
                  {/* <Scrollable shadow style={{height: '400px'}}> */} {/* Optional: Add Scrollable if list is long */} 
                    <BlockStack gap="150">
                      {mappingOptions.map(option => {
                        const isMapped = mappedSourceKeys.has(option.value);
                        // Get the value from the processed data using the option's value (key)
                        const fieldValue = processedPreviewData ? processedPreviewData[option.value] : undefined;
                        const truncatedValue = truncateString(fieldValue, 30); // Truncate to 30 chars
                        const fullJsonString = JSON.stringify(fieldValue, null, 2);
                        const truncatedJson = truncateString(fullJsonString, 500); // Truncate JSON to 500 chars

                        return (
                          // Use InlineGrid for proper column alignment (icon, label, value)
                          <InlineGrid key={option.value} columns="auto auto 1fr" gap="150" alignItems="center">
                            {/* Column 1: Icon */}
                            <Icon
                              source={isMapped ? CheckCircleIcon : InfoIcon}
                              tone={isMapped ? 'success' : 'base'}
                            />
                            {/* Column 2: Text (Label) */}
                            <Text variant="bodyMd" as="span" fontWeight="medium">{option.label}</Text>
                            {/* Column 3: Text (Truncated Value) wrapped in Tooltip */}
                            <Tooltip
                              content={truncatedJson} // Use truncated JSON string directly
                              dismissOnMouseOut
                            >
                              <Text variant="bodySm" as="span" tone="subdued">{truncatedValue}</Text>
                            </Tooltip>
                          </InlineGrid>
                        );
                      })}
                    </BlockStack>
                   {/* </Scrollable> */} 
                </Box>
                <Text variant="bodySm" tone="subdued">Icon indicates mapped status.</Text>
              </BlockStack>
            </InlineGrid>
          )}
        </BlockStack>
      </div>
    </BlockStack>
  )
}

export default WizardStepMapping 