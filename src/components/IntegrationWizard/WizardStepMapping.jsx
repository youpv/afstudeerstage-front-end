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
  Box,
  Icon,
  Card,
  TextField,
  InlineError,
} from '@shopify/polaris'
import {
  PlusCircleIcon,
  MinusCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  DeleteIcon,
  WandIcon,
} from '@shopify/polaris-icons'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { suggestMappings, DEFAULT_MAPPING_SYSTEM_PROMPT } from '../../services/openai-client'

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
  { label: 'Color', value: 'color' },
  { label: 'Weight', value: 'weight' },
  { label: 'Volume', value: 'volume' },
  { label: 'Dimension', value: 'dimension' },
  { label: 'Rating', value: 'rating' },
  { label: 'List: Single line text', value: 'list.single_line_text_field' },
  { label: 'List: Multi line text', value: 'list.multi_line_text_field' },
  { label: 'List: Integer', value: 'list.number_integer' },
  { label: 'List: Decimal', value: 'list.number_decimal' },
  { label: 'List: Boolean', value: 'list.boolean' },
  { label: 'List: URL', value: 'list.url' },
  { label: 'List: Date', value: 'list.date' },
  { label: 'List: Date & Time', value: 'list.date_time' },
  { label: 'List: JSON String', value: 'list.json_string' },
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
 *  processedPreviewData: object | null // The actual data object for value preview & AI mapping
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

  // --- AI Mapping State ---
  const [isAiMappingLoading, setIsAiMappingLoading] = useState(false);
  const [aiMappingError, setAiMappingError] = useState('');

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
    const config = {};
    // Helper to create setter for a specific optional field key
    const createSetter = (fieldConstName) => (value) => {
      // Use the constant name (e.g., FIELD_VENDOR) as the key
      setOptionalFieldKeys(prev => ({ ...prev, [fieldConstName]: value }));
    };

    // Define labels and help text using the constant names as keys
    // Iterate over the fieldConstants prop passed from the parent
    for (const fieldConstName in fieldConstants) {
        if (Object.prototype.hasOwnProperty.call(fieldConstants, fieldConstName)) {
            const fieldValue = fieldConstants[fieldConstName]; // e.g., 'vendor'
            let label = 'Unknown Field';
            let helpText = 'Map this field.';
            const id = `${fieldValue}Key`; // Use value for ID generation for stability

            // Assign label and helpText based on the constant name
            // This switch statement maps constant names to UI text
            switch (fieldConstName) {
                case 'FIELD_DESCRIPTION_HTML':
                    label = 'Description (HTML)';
                    helpText = 'Map to the product description (HTML is supported).';
                    break;
                case 'FIELD_VENDOR':
                    label = 'Vendor';
                    helpText = 'Map to the brand or vendor name.';
                    break;
                case 'FIELD_HANDLE':
                    label = 'Handle';
                    helpText = 'Map to the unique URL handle (e.g., product-name).';
                    break;
                case 'FIELD_PRODUCT_TYPE':
                    label = 'Product Type';
                    helpText = 'Map to product type (e.g., T-Shirt, Mug).';
                    break;
                case 'FIELD_TAGS':
                    label = 'Tags';
                    helpText = 'Map to a comma-separated list or array of tags.';
                    break;
                case 'FIELD_STATUS':
                    label = 'Status';
                    helpText = 'Map to product status (ACTIVE, ARCHIVED, DRAFT).';
                    break;
                case 'FIELD_SEO_TITLE':
                    label = 'SEO Title';
                    helpText = 'Map to the search engine title.';
                    break;
                case 'FIELD_SEO_DESCRIPTION':
                    label = 'SEO Description';
                    helpText = 'Map to the search engine description.';
                    break;
                case 'FIELD_PUBLISHED_AT':
                    label = 'Published At';
                    helpText = 'Map to the publication date/time (ISO 8601 format).';
                    break;
                case 'FIELD_REQUIRES_SELLING_PLAN':
                    label = 'Requires Selling Plan';
                    helpText = 'Map to a boolean (true/false) indicating if a selling plan is required.';
                    break;
                case 'FIELD_TEMPLATE_SUFFIX':
                    label = 'Template Suffix';
                    helpText = 'Map to the theme template suffix.';
                    break;
                case 'FIELD_SKU':
                    label = 'SKU';
                    helpText = 'Map to the Stock Keeping Unit.';
                    break;
                case 'FIELD_BARCODE':
                    label = 'Barcode';
                    helpText = 'Map to the barcode (UPC, EAN, ISBN).';
                    break;
                case 'FIELD_PRICE':
                    label = 'Price';
                    helpText = 'Map to the selling price.';
                    break;
                case 'FIELD_COMPARE_AT_PRICE':
                    label = 'Compare At Price';
                    helpText = 'Map to the original price before discount.';
                    break;
                case 'FIELD_WEIGHT':
                    label = 'Weight';
                    helpText = 'Map to the product weight (numeric value).';
                    break;
                case 'FIELD_WEIGHT_UNIT':
                    label = 'Weight Unit';
                    helpText = 'Map to the weight unit (KILOGRAMS, GRAMS, POUNDS, OUNCES).';
                    break;
                case 'FIELD_INVENTORY_POLICY':
                    label = 'Inventory Policy';
                    helpText = 'Map to DENY or CONTINUE selling when out of stock.';
                    break;
                case 'FIELD_INVENTORY_QUANTITY':
                    label = 'Inventory Quantity';
                    helpText = 'Map to the available stock quantity.';
                    break;
                case 'FIELD_INVENTORY_MANAGEMENT':
                    label = 'Inventory Management';
                    helpText = 'Map to SHOPIFY, NOT_MANAGED, or FULFILLMENT_SERVICE.';
                    break;
                case 'FIELD_TAXABLE':
                    label = 'Taxable';
                    helpText = 'Map to a boolean (true/false) indicating if the product is taxable.';
                    break;
                case 'FIELD_TAX_CODE':
                    label = 'Tax Code';
                    helpText = 'Map to a tax code (e.g., for Avalara).';
                    break;
                case 'FIELD_HARMONIZED_SYSTEM_CODE':
                    label = 'HS Code';
                    helpText = 'Map to the Harmonized System code for customs.';
                    break;
                case 'FIELD_REQUIRES_SHIPPING':
                    label = 'Requires Shipping';
                    helpText = 'Map to a boolean (true/false) indicating if shipping is required.';
                    break;
                case 'FIELD_COST':
                    label = 'Cost of Goods';
                    helpText = 'Map to the cost of the item (inventoryItem.cost).';
                    break;
                // Add other cases as needed
            }

            // Use the constant name (e.g., FIELD_VENDOR) as the key for the config object
            config[fieldConstName] = {
                label: label,
                setter: createSetter(fieldConstName), // Pass the constant name to the setter
                id: id,
                helpText: helpText,
            };
        }
    }
    return config;
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

  // --- AI Mapping Logic ---
  const handleAiMapClick = useCallback(async () => {
    setIsAiMappingLoading(true);
    setAiMappingError('');

    if (!processedPreviewData) {
      setAiMappingError("Cannot run AI mapping without fetched and processed data.");
      setIsAiMappingLoading(false);
      return;
    }

    // Prepare the system prompt by injecting the actual field constants
    const fieldConstantsString = Object.entries(fieldConstants)
        .map(([key, value]) => `* ${value} (${key})`) // Show constant name and its actual value
        .join('\n');
    const systemPrompt = DEFAULT_MAPPING_SYSTEM_PROMPT.replace(
        '{/* We will inject the actual constants here */}',
        fieldConstantsString
    );

    

    try {
      const suggested = await suggestMappings(processedPreviewData, systemPrompt);

      
      
      // Get list of available source keys for validation
      const availableSourceKeys = mappingOptions.map(opt => opt.value);
      

      // --- Apply Suggestions (Basic Implementation - Overwrites existing) ---
      // Validate response structure (add more robust validation as needed)
      if (!suggested || typeof suggested !== 'object') {
        throw new Error("AI response was not a valid object.");
      }

      // 1. Apply Title Key
      if (suggested.titleKey && typeof suggested.titleKey === 'string') {
        // Check if the suggested key exists in mappingOptions
        if (availableSourceKeys.includes(suggested.titleKey)) {
          setTitleKey(suggested.titleKey);
          
        } else {
          console.warn(`AI suggested titleKey '${suggested.titleKey}' not found in available options.`);
        }
      } else {
        console.warn("AI did not suggest a valid titleKey.");
        // Optional: Keep existing titleKey or clear it?
      }

      // 2. Apply Optional Fields
      const newOptionalKeys = {};
      const newActiveFields = [];
      
      if (suggested.optionalFieldKeys && typeof suggested.optionalFieldKeys === 'object') {
        // Log all the optionalFieldKeys suggested by AI
        
        
        // Log field constants for debugging
        
        
        Object.entries(suggested.optionalFieldKeys).forEach(([fieldConstantValue, sourceKey]) => {
          // fieldConstantValue should be the constant name like 'FIELD_SKU'
          // sourceKey should be the key from the source data like 'sku'

          // For debugging, log each field mapping attempt
          
          // Check if the key suggested by AI ('fieldConstantValue') is a valid key in our fieldConstants prop
          const isValidConstantKey = Object.prototype.hasOwnProperty.call(fieldConstants, fieldConstantValue);
          const isValidSourceKey = typeof sourceKey === 'string' && availableSourceKeys.includes(sourceKey);

          
          

          // Check if the constant key is valid AND the source key exists in the data
          if (isValidConstantKey && isValidSourceKey) {
            // Use fieldConstantValue directly as it IS the correct internal key
            newOptionalKeys[fieldConstantValue] = sourceKey;
            newActiveFields.push(fieldConstantValue);
            
          } else {
            console.warn(`AI suggested invalid or non-existent mapping for optional field '${fieldConstantValue}' to source key '${sourceKey}'. Constant valid: ${isValidConstantKey}, Source valid: ${isValidSourceKey}`);
          }
        });
      }
      
      // Log what we're actually setting for optional fields
      
      
      
      setOptionalFieldKeys(prev => ({ ...prev, ...newOptionalKeys })); // Merge suggestions with existing
      setActiveOptionalFields(prev => [...new Set([...prev, ...newActiveFields])]); // Add newly activated fields

      // 3. Apply Metafield Mappings (Overwrite existing for simplicity first)
      if (Array.isArray(suggested.metafieldMappings)) {
        const validMetafieldMappings = suggested.metafieldMappings
          .map((mf, index) => ({ ...mf, id: `ai-${Date.now()}-${index}` })) // Assign unique IDs
          .filter(mf => {
            // Basic validation: check required fields based on type
            if (!mf.mappingType || !mf.sourceKey || !mf.metafieldNamespace || !mf.metafieldType) {
              console.warn(`Invalid metafield mapping: missing required fields`, mf);
              return false;
            }
            
            if (!availableSourceKeys.includes(mf.sourceKey)) {
                console.warn(`AI suggested metafield sourceKey '${mf.sourceKey}' not found in available options.`);
                return false; // Invalid source key
            }
            
            if (mf.mappingType === 'single' && !mf.metafieldKey) {
              console.warn(`Invalid single metafield mapping: missing metafieldKey`, mf);
              return false;
            }
            
            if (mf.mappingType === 'dynamic_from_array' && (!mf.arrayKeySource || !mf.arrayValueSource)) {
              console.warn(`Invalid dynamic metafield mapping: missing arrayKeySource or arrayValueSource`, mf);
              return false;
            }
            
            // Extra validation: for dynamic mappings, check if source data is actually an array of objects
            if (mf.mappingType === 'dynamic_from_array') {
              const sourceData = processedPreviewData[mf.sourceKey];
              if (!isArrayOfObjects(sourceData)) {
                console.warn(`Invalid dynamic metafield mapping: source is not an array of objects`, mf);
                return false;
              }
              
              // Check if array key/value sources exist in the array objects
              if (sourceData.length > 0) {
                const firstItem = sourceData[0];
                if (!Object.prototype.hasOwnProperty.call(firstItem, mf.arrayKeySource)) {
                  console.warn(`Invalid dynamic mapping: arrayKeySource '${mf.arrayKeySource}' not found in array objects`, mf);
                  return false;
                }
                if (!Object.prototype.hasOwnProperty.call(firstItem, mf.arrayValueSource)) {
                  console.warn(`Invalid dynamic mapping: arrayValueSource '${mf.arrayValueSource}' not found in array objects`, mf);
                  return false;
                }
              }
            }
            
            
            return true;
          });
        
        
        setMetafieldMappings(validMetafieldMappings);
      } else {
         setMetafieldMappings([]); // Clear if AI didn't provide valid array
      }

      // --- End Apply Suggestions ---

    } catch (error) {
      console.error("AI Mapping Error:", error);
      setAiMappingError(`AI mapping failed: ${error.message}`);
    } finally {
      setIsAiMappingLoading(false);
    }
  }, [processedPreviewData, fieldConstants, setTitleKey, setOptionalFieldKeys, setActiveOptionalFields, setMetafieldMappings, mappingOptions]);

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
                  {/* === AI Mapping Action === */}
                  <Card roundedAbove="sm">
                     <Box padding="400">
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center" wrap={false}>
                            <Text variant="headingSm" as="h3">Automatic Mapping (AI)</Text>
                            <Button
                              icon={WandIcon}
                              onClick={handleAiMapClick}
                              loading={isAiMappingLoading}
                              disabled={!processedPreviewData || isAiMappingLoading}
                            >
                              Map with AI
                            </Button>
                          </InlineStack>
                          <Text variant="bodyMd" tone="subdued">
                             Let AI analyze your data sample and suggest mappings for standard fields and metafields. Review suggestions carefully.
                          </Text>
                          {aiMappingError && (
                             <InlineError message={aiMappingError} fieldID="aiMappingError" />
                          )}
                        </BlockStack>
                     </Box>
                  </Card>

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