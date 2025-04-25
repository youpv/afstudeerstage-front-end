import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Page,
  Layout,
  Card,
  Box,
} from '@shopify/polaris'
import { useMutation } from '@tanstack/react-query'

// Import sub-components
import WizardStepsIndicator from '../components/IntegrationWizard/WizardStepsIndicator'
import WizardActions from '../components/IntegrationWizard/WizardActions'
import WizardStepBasics from '../components/IntegrationWizard/WizardStepBasics'
import WizardStepConnectionFtp from '../components/IntegrationWizard/WizardStepConnectionFtp'
import WizardStepMapping from '../components/IntegrationWizard/WizardStepMapping'
import WizardStepSchedule from '../components/IntegrationWizard/WizardStepSchedule'

// API function to test FTP connection
const testFtpConnection = async (credentials) => {
  const response = await fetch('/api/ftp/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Connection failed');
  }
  return result; // Contains success: true
};

// API function to download file via FTP
const downloadFtpFile = async ({ credentials, filePath }) => {
  const response = await fetch('/api/ftp/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentials, filePath }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to download file');
  }
  return result.data; // Return the actual data
};

// Helper function to extract data from a nested path
const getDataFromPath = (obj, path) => {
  if (!path || path === '') return obj;

  try {
    const parts = path.split('.');
    let result = obj;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (result === null || result === undefined) {
        return null;
      }

      // Handle array notation: items[0]
      if (part.includes('[') && part.includes(']')) {
        const [arrayName, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''), 10);
        
        result = result[arrayName];
        if (Array.isArray(result) && result.length > index) {
          result = result[index];
        } else {
          return null; // Array doesn't exist or is too short
        }
      } else if (Array.isArray(result)) {
        // If we encounter an array, get the first item automatically
        result = result.length > 0 ? result[0] : null;
        
        // If we still have path parts to process, get the next property
        if (i < parts.length) {
          result = result?.[part];
        }
      } else {
        // Regular object property
        result = result[part];
      }
    }

    // If result is an array at the end, return the first item
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    }

    return result;
  } catch (/* eslint-disable-next-line no-unused-vars */
    _
  ) {
    return null;
  }
};

// Extract options for mapping from obj
const extractMappingOptions = (obj) => {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).map((key) => ({ label: key, value: key }));
};

const PREVIEW_CHAR_LIMIT = 5000; // Max characters for the preview <pre> tag

// Define constants for the field names to avoid typos
const FIELD_TITLE = 'title';
const FIELD_DESCRIPTION_HTML = 'descriptionHtml';
const FIELD_VENDOR = 'vendor';
const FIELD_HANDLE = 'handle';
const FIELD_PRODUCT_TYPE = 'productType';
const FIELD_TAGS = 'tags'; // Can be string or array in source
const FIELD_STATUS = 'status'; // Enum: ACTIVE, ARCHIVED, DRAFT
const FIELD_SEO_TITLE = 'seo.title';
const FIELD_SEO_DESCRIPTION = 'seo.description';
const FIELD_PUBLISHED_AT = 'publishedAt'; // DateTime
const FIELD_REQUIRES_SELLING_PLAN = 'requiresSellingPlan'; // Boolean
const FIELD_TEMPLATE_SUFFIX = 'templateSuffix';

// Fields previously nested under Variant
const FIELD_SKU = 'sku';
const FIELD_BARCODE = 'barcode';
const FIELD_PRICE = 'price'; // Money
const FIELD_COMPARE_AT_PRICE = 'compareAtPrice'; // Money
const FIELD_WEIGHT = 'weight'; // Float
const FIELD_WEIGHT_UNIT = 'weightUnit'; // Enum: KILOGRAMS, GRAMS, POUNDS, OUNCES
const FIELD_INVENTORY_POLICY = 'inventoryPolicy'; // Enum: DENY, CONTINUE
const FIELD_INVENTORY_QUANTITY = 'inventoryQuantity'; // Representing available quantity
const FIELD_INVENTORY_MANAGEMENT = 'inventoryManagement'; // Enum: SHOPIFY, NOT_MANAGED, FULFILLMENT_SERVICE
const FIELD_TAXABLE = 'taxable'; // Boolean
const FIELD_TAX_CODE = 'taxCode';
const FIELD_HARMONIZED_SYSTEM_CODE = 'harmonizedSystemCode';
const FIELD_REQUIRES_SHIPPING = 'requiresShipping'; // Boolean
const FIELD_COST = 'inventoryItem.cost'; // Decimal (Nested under inventoryItem)

// Removed: FIELD_ID, FIELD_PUBLISHABLE (read-only), FIELD_PRODUCT_OPTIONS, FIELD_VARIANTS,
// Removed: FIELD_METAFIELDS, FIELD_IMAGES, FIELD_FILES,
// Removed: FIELD_COLLECTIONS_TO_JOIN, FIELD_COLLECTIONS_TO_LEAVE

function IntegrationWizard({ onFinish, initialData = null }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  // State related to testing/fetching is now managed by React Query mutations
  const [remoteData, setRemoteData] = useState(null) // Keep raw downloaded data separate
  const [processedPreviewData, setProcessedPreviewData] = useState(null) // Data after applying dataPath
  const [mappingOptions, setMappingOptions] = useState([])
  const [dataPathError, setDataPathError] = useState('')

  // --- Shared State ---
  const [name, setName] = useState(initialData?.name ?? '')
  const nameId = 'integrationName'

  // --- Step 1: Connection Type ---
  const [connectionType, setConnectionType] = useState(initialData?.connectionType ?? 'ftp')

  // --- Step 2: Credentials (FTP specific) ---
  const [ftpHost, setFtpHost] = useState(initialData?.credentials?.ftpHost ?? '')
  const [ftpPort, setFtpPort] = useState(initialData?.credentials?.ftpPort ?? '21')
  const [ftpUser, setFtpUser] = useState(initialData?.credentials?.ftpUser ?? '')
  const [ftpPassword, setFtpPassword] = useState(initialData?.credentials?.ftpPassword ?? '')
  const [filePath, setFilePath] = useState(initialData?.credentials?.filePath ?? '/productdata.json')
  const [dataPath, setDataPath] = useState(initialData?.credentials?.dataPath ?? '')
  const ftpHostId = 'ftpHost'
  const ftpPortId = 'ftpPort'
  const ftpUserId = 'ftpUser'
  const ftpPasswordId = 'ftpPassword'
  const filePathId = 'filePath'
  const dataPathId = 'dataPath'

  // --- Step 3: Mapping State ---
  // Required Core Field
  const [titleKey, setTitleKey] = useState(initialData?.mapping?.[FIELD_TITLE] ?? '')
  const titleKeyId = 'titleKey'

  // Optional Fields State (Key = field name, Value = mapped key from source)
  const [optionalFieldKeys, setOptionalFieldKeys] = useState(() => {
    const initialKeys = {};
    const mapping = initialData?.mapping ?? {};

    // Populate from initialData if available, using the new flat structure
    [
      FIELD_DESCRIPTION_HTML, FIELD_VENDOR, FIELD_HANDLE, FIELD_PRODUCT_TYPE,
      FIELD_TAGS, FIELD_STATUS, FIELD_SEO_TITLE, FIELD_SEO_DESCRIPTION,
      FIELD_PUBLISHED_AT, FIELD_REQUIRES_SELLING_PLAN, FIELD_TEMPLATE_SUFFIX,
      // Added flat fields (previously under variants)
      FIELD_SKU, FIELD_BARCODE, FIELD_PRICE, FIELD_COMPARE_AT_PRICE,
      FIELD_WEIGHT, FIELD_WEIGHT_UNIT, FIELD_INVENTORY_POLICY,
      FIELD_INVENTORY_QUANTITY, FIELD_INVENTORY_MANAGEMENT, FIELD_TAXABLE,
      FIELD_TAX_CODE, FIELD_HARMONIZED_SYSTEM_CODE, FIELD_REQUIRES_SHIPPING,
      FIELD_COST,
    ].forEach(field => {
        // Handle nested fields explicitly
        if (field === FIELD_SEO_TITLE && mapping.seo?.title) {
            initialKeys[field] = mapping.seo.title;
        } else if (field === FIELD_SEO_DESCRIPTION && mapping.seo?.description) {
            initialKeys[field] = mapping.seo.description;
        } else if (field === FIELD_COST && mapping.inventoryItem?.cost) {
            initialKeys[field] = mapping.inventoryItem.cost;
        // Handle top-level fields
        } else if (mapping[field]) {
            initialKeys[field] = mapping[field];
        } else {
            initialKeys[field] = ''; // Initialize with empty string if not in initialData
        }
    });
    return initialKeys;
  });

  // Tracks which optional fields the user has chosen to map
  const [activeOptionalFields, setActiveOptionalFields] = useState(() => {
      // Determine active fields based on whether a key exists in initialData.mapping
      const mapping = initialData?.mapping ?? {};
      const active = [];
      Object.keys(optionalFieldKeys).forEach(fieldKey => {
        // Check if the key exists directly or within nested structures
        if (fieldKey === FIELD_SEO_TITLE && mapping.seo?.title) {
             active.push(fieldKey);
        } else if (fieldKey === FIELD_SEO_DESCRIPTION && mapping.seo?.description) {
            active.push(fieldKey);
        } else if (fieldKey === FIELD_COST && mapping.inventoryItem?.cost) {
            active.push(fieldKey);
        } else if (mapping[fieldKey]) {
            active.push(fieldKey);
        }
      });
      // Filter the active list based on the *actually initialized* keys in optionalFieldKeys
      // This ensures fields added later don't incorrectly start as active if not in initialData
      return active.filter(field => optionalFieldKeys[field] !== undefined && optionalFieldKeys[field] !== '');
  });

  // --- Metafield Mapping State ---
  const [metafieldMappings, setMetafieldMappings] = useState(
    initialData?.metafieldMappings ?? []
  );
  // Structure for an item in metafieldMappings:
  // {
  //   id: string; // Unique ID for React key prop
  //   mappingType: 'single' | 'dynamic_from_array'; // New field
  //   sourceKey: string; // e.g., 'model' or 'properties'
  //   metafieldNamespace: string;
  //   metafieldKey: string; // e.g., 'model_codes' or base key like 'prop'
  //   metafieldType: string; // For 'single', the exact type. For 'dynamic', the default/base type.
  //   // --- Fields specific to 'dynamic_from_array' --- 
  //   arrayKeySource?: string; // Field within array object to use for the metafield key (e.g., 'prop_code')
  //   arrayValueSource?: string; // Field within array object to use for the metafield value (e.g., 'prod_value')
  //   // transformation: string | null; // Future
  // }

  // --- Step 4: Schedule ---
  const [frequency, setFrequency] = useState(initialData?.syncFrequency ?? '24')
  const frequencyId = 'frequency'

  const steps = ['Basics', 'Connection', 'Mapping', 'Schedule']

  // --- React Query Mutations ---

  const downloadMutation = useMutation({
    mutationFn: downloadFtpFile,
    onSuccess: (data) => {
      setRemoteData(data); // Store raw data
      // Trigger processing immediately after download
      processRemoteData(data, dataPath);
    },
    onError: (/* error */) => {
      // Error message is displayed via downloadMutation.error
      setRemoteData(null);
      setProcessedPreviewData(null);
      setMappingOptions([]);
      setDataPathError('');
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: testFtpConnection,
    onSuccess: () => {
      // If test is successful, trigger the download
      const currentCredentials = {
        host: ftpHost,
        port: ftpPort || 21,
        user: ftpUser,
        password: ftpPassword,
      };
      downloadMutation.mutate({ credentials: currentCredentials, filePath });
    },
    onError: (/* error */) => {
       // Error message is displayed via testConnectionMutation.error
       setRemoteData(null);
       setProcessedPreviewData(null);
       setMappingOptions([]);
       setDataPathError('');
    },
  });

  // Function to process data based on dataPath (called on download success or dataPath change)
  const processRemoteData = (dataToProcess, currentDataPath) => {
      setDataPathError('');
      setMappingOptions([]);
      setProcessedPreviewData(null);

      if (dataToProcess === null || dataToProcess === undefined) {
          return;
      }
      
      if (typeof dataToProcess !== 'object' && typeof dataToProcess !== 'string') {
          setDataPathError('Downloaded data is not in a readable format (expected JSON object/array or text).');
          setProcessedPreviewData(dataToProcess); // Show the raw non-object data
          return;
      }

      try {
          const extractedData = getDataFromPath(dataToProcess, currentDataPath);
          setProcessedPreviewData(extractedData);

          let objectForMapping = null;
          if (extractedData !== null && typeof extractedData === 'object' && !Array.isArray(extractedData)) {
              objectForMapping = extractedData;
          } else if (Array.isArray(extractedData) && extractedData.length > 0 && typeof extractedData[0] === 'object') {
              objectForMapping = extractedData[0];
          } else if (extractedData !== null) { // Don't error if path yields null/undefined, just no options
              setDataPathError('Data at the specified path is not suitable for mapping (must be an object or array of objects).');
              setTitleKey(''); // Reset required field
              setOptionalFieldKeys({}); // Reset all optional keys
              setActiveOptionalFields([]); // Clear active fields
          }

          if (objectForMapping) {
              const options = extractMappingOptions(objectForMapping);
              setMappingOptions(options);
              const validOptionValues = options.map(o => o.value);

              // Helper to reset key if invalid or keep existing if valid
              const checkAndSetKey = (currentKey, setKeyFn) => {
                if (currentKey && !validOptionValues.includes(currentKey)) {
                  setKeyFn(''); // Reset if current key is no longer valid
                }
                // If currentKey is empty or valid, keep it as is.
              };
              
              // Auto-select first option only if current selection is empty AND options exist
               const autoSelectKey = (currentKey, setKeyFn) => {
                 if (!currentKey && options.length > 0) {
                   setKeyFn(options[0].value);
                 } else {
                   checkAndSetKey(currentKey, setKeyFn);
                 }
               };

              if (options.length > 0) {
                  // Reset or Auto-select required field
                  autoSelectKey(titleKey, setTitleKey);

                  // Check/Reset all potential optional field keys based on new options
                  setOptionalFieldKeys(prevKeys => {
                    const newKeys = { ...prevKeys };
                    Object.keys(newKeys).forEach(field => {
                      if (newKeys[field] && !validOptionValues.includes(newKeys[field])) {
                         newKeys[field] = ''; // Reset if invalid
                      }
                    });
                    return newKeys;
                  });

                  // Remove active optional fields whose keys are now invalid
                  setActiveOptionalFields(prevFields =>
                     prevFields.filter(field => {
                       const currentMappedKey = optionalFieldKeys[field];
                       return currentMappedKey && validOptionValues.includes(currentMappedKey);
                     })
                   );

                  // Check/Reset metafield mappings based on new options
                  setMetafieldMappings(prevMappings =>
                    prevMappings.map(mapping => {
                      if (mapping.sourceKey && !validOptionValues.includes(mapping.sourceKey)) {
                        // If sourceKey becomes invalid, keep the mapping definition
                        // but clear the sourceKey to indicate it needs re-mapping.
                        // Alternatively, you could filter it out: return null;
                        return { ...mapping, sourceKey: '' };
                      }
                      return mapping;
                    }).filter(Boolean) // Remove nulls if filtering out
                  );

              } else {
                  setDataPathError('No mappable fields found in the data object at the specified path.');
                  // Reset all keys if no options are available
                  setTitleKey('');
                  setOptionalFieldKeys({});
                  setActiveOptionalFields([]); // Clear active fields
                  // Reset metafield mappings if path yields no data or invalid data
                  setMetafieldMappings([]);
              }
          } else if (extractedData === null && currentDataPath !== '') {
              setDataPathError('The specified Data Path resulted in no data. Check the path and the source file.');
              // Reset all keys if path yields no data
              setTitleKey('');
              setOptionalFieldKeys({});
              setActiveOptionalFields([]); // Clear active fields
              // Reset metafield mappings if path yields no data or invalid data
              setMetafieldMappings([]);
          } else if (extractedData === null && currentDataPath === '') {
              // If root is null/empty, that's fine, just no options
              setDataPathError('The source file appears empty or is not a valid JSON object/array at the root.');
              // Reset all keys if root is null/empty
              setTitleKey('');
              setOptionalFieldKeys({});
              setActiveOptionalFields([]); // Clear active fields
              // Reset metafield mappings if root is null/empty
              setMetafieldMappings([]);
          } else if (dataPathError && !objectForMapping) { // If there was a data structure error
            // ... reset standard keys ...
            setMetafieldMappings([]);
          }

      } catch (error) {
          console.error("Error processing data:", error);
          setProcessedPreviewData({ error: `Failed to process data path: ${error.message}` });
          setMappingOptions([]);
          setDataPathError(`Invalid path format or error processing data: ${error.message}`);
          setTitleKey('');
          setOptionalFieldKeys({});
          setActiveOptionalFields([]);
          setMetafieldMappings([]); // Reset on error
      }
  };

  // Effect to re-process data when dataPath changes
  useEffect(() => {
    // Only process if we actually have raw data downloaded
    if (remoteData !== null) {
      processRemoteData(remoteData, dataPath);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataPath]); // Rerun processing when dataPath changes, relies on remoteData being stable

  // Trigger the test connection
  const handleTestConnectionClick = () => {
    const currentCredentials = {
      host: ftpHost,
      port: ftpPort || 21,
      user: ftpUser,
      password: ftpPassword,
    };
    testConnectionMutation.mutate(currentCredentials);
  };

  // Basic validation for enabling next/finish
  const isNextDisabled = (() => {
    if (step === 0 && !name) return true;
    // Enable next on step 1 if connection test succeeded OR if download succeeded (meaning test implicitly succeeded)
    if (step === 1 && connectionType === 'ftp' && (!ftpHost || !ftpUser || !ftpPassword || !filePath || (!testConnectionMutation.isSuccess && !downloadMutation.isSuccess))) return true;
    // Only check for the required title mapping
    if (step === 2 && (!titleKey || mappingOptions.length === 0)) return true;
    if (step === 3 && !frequency) return true;
    return false;
  })();

  // --- Navigation and Submit Handlers ---
  function handleNext() {
    setStep((s) => Math.min(s + 1, steps.length - 1))
  }
  function handleBack() {
    if (step === 0) {
      navigate(-1)
    } else {
      setStep((s) => Math.max(s - 1, 0))
    }
  }
  function handleSubmit() {
    const finalMapping = {
      [FIELD_TITLE]: titleKey, // Always include title
      seo: {}, // Initialize seo object
      inventoryItem: {}, // Initialize inventoryItem object for cost
    };

    // Add mapped optional standard fields to the mapping object
    activeOptionalFields.forEach(field => {
      const mappedKey = optionalFieldKeys[field];
      if (mappedKey) { // Only include if a key was actually selected
          // Handle nested structures
          if (field === FIELD_SEO_TITLE) {
            finalMapping.seo.title = mappedKey;
          } else if (field === FIELD_SEO_DESCRIPTION) {
            finalMapping.seo.description = mappedKey;
          } else if (field === FIELD_COST) {
             finalMapping.inventoryItem.cost = mappedKey;
          // Handle flat fields
          } else {
            finalMapping[field] = mappedKey;
          }
      }
    });

    // Remove empty nested objects if no relevant fields were mapped
    if (Object.keys(finalMapping.seo).length === 0) {
      delete finalMapping.seo;
    }
    if (Object.keys(finalMapping.inventoryItem).length === 0) {
       delete finalMapping.inventoryItem;
    }

    const integration = {
      id: initialData?.id ?? Date.now().toString(),
      name,
      connectionType,
      ...(connectionType === 'ftp' && {
        credentials: {
          ftpHost,
          ftpPort: ftpPort || 21,
          ftpUser,
          ftpPassword,
          filePath,
          dataPath
        },
      }),
      mapping: finalMapping, // Standard Shopify fields mapping
      metafieldMappings: metafieldMappings.map((mapping) => {
        // Keep only the relevant fields based on mappingType
        const { id: _id, mappingType, ...rest } = mapping;
        if (mappingType === 'dynamic_from_array') {
          // For dynamic, we need specific fields
          return {
            mappingType: 'dynamic_from_array',
            sourceKey: rest.sourceKey,
            metafieldNamespace: rest.metafieldNamespace,
            // Note: metafieldKey might represent a base or prefix here if needed, or be unused directly by backend
            // metafieldKey: rest.metafieldKey, 
            arrayKeySource: rest.arrayKeySource,
            arrayValueSource: rest.arrayValueSource,
            metafieldType: rest.metafieldType, // Represents the default type for dynamic ones
          };
        } else {
          // For single, keep the standard fields
           return {
             mappingType: 'single',
             sourceKey: rest.sourceKey,
             metafieldNamespace: rest.metafieldNamespace,
             metafieldKey: rest.metafieldKey,
             metafieldType: rest.metafieldType,
           };
        }
      }),
      syncFrequency: frequency,
    }

    // --- Saving to LocalStorage (Temporary) ---
    try {
      const existingIntegrations = JSON.parse(localStorage.getItem('integrations') || '[]');
      const index = existingIntegrations.findIndex(integ => integ.id === integration.id);
      if (index > -1) {
        existingIntegrations[index] = integration; // Update existing
      } else {
        existingIntegrations.push(integration); // Add new
      }
      localStorage.setItem('integrations', JSON.stringify(existingIntegrations));
      console.log('Integration saved to LocalStorage:', integration);
    } catch (error) {
      console.error("Error saving integration to LocalStorage:", error);
      // Optionally show an error to the user
    }
    // --- End LocalStorage Saving ---

    onFinish(integration)
  }

  // Calculate truncated preview string using useMemo for efficiency
  const truncatedPreviewString = useMemo(() => {
    // Show preview based on *processed* data
    if (processedPreviewData === null) return '{ info: "No data fetched or processed yet." }';

    let fullString = '';
    try {
      if (typeof processedPreviewData === 'object') {
        fullString = JSON.stringify(processedPreviewData, null, 2);
      } else {
        fullString = String(processedPreviewData); // Handle non-object data (e.g., strings, numbers)
      }
    } catch (e) {
      fullString = `{ error: "Could not format preview data: ${e.message}" }`;
    }

    if (fullString.length > PREVIEW_CHAR_LIMIT) {
      return fullString.substring(0, PREVIEW_CHAR_LIMIT) + '\n... (truncated)';
    } else {
      return fullString;
    }
  }, [processedPreviewData]);

  // Determine loading state for the button
  const isConnectionStepLoading = testConnectionMutation.isPending || downloadMutation.isPending;

  // --- Render Logic ---
  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <WizardStepBasics
            name={name}
            setName={setName}
            nameId={nameId}
            connectionType={connectionType}
            setConnectionType={setConnectionType}
            stepTitle={steps[0]}
          />
        );
      case 1:
        if (connectionType === 'ftp') {
          return (
            <WizardStepConnectionFtp
              stepTitle={`${steps[1]}: FTP Details`}
              ftpHost={ftpHost}
              setFtpHost={setFtpHost}
              ftpHostId={ftpHostId}
              ftpPort={ftpPort}
              setFtpPort={setFtpPort}
              ftpPortId={ftpPortId}
              ftpUser={ftpUser}
              setFtpUser={setFtpUser}
              ftpUserId={ftpUserId}
              ftpPassword={ftpPassword}
              setFtpPassword={setFtpPassword}
              ftpPasswordId={ftpPasswordId}
              filePath={filePath}
              setFilePath={setFilePath}
              filePathId={filePathId}
              dataPath={dataPath}
              setDataPath={setDataPath}
              dataPathId={dataPathId}
              handleTestConnectionClick={handleTestConnectionClick}
              testConnectionMutation={testConnectionMutation}
              downloadMutation={downloadMutation}
              processedPreviewData={processedPreviewData}
              truncatedPreviewString={truncatedPreviewString}
              dataPathError={dataPathError}
              remoteData={remoteData}
            />
          );
        }
        // Add cases for other connection types here if needed
        return <div>Connection type '{connectionType}' not yet implemented.</div>;
      case 2:
        return (
          <WizardStepMapping
            stepTitle={steps[2]}
            // Required field
            titleKey={titleKey}
            setTitleKey={setTitleKey}
            titleKeyId={titleKeyId}
            // Optional fields management
            optionalFieldKeys={optionalFieldKeys}
            setOptionalFieldKeys={setOptionalFieldKeys}
            activeOptionalFields={activeOptionalFields}
            setActiveOptionalFields={setActiveOptionalFields}
            // Metafield mapping management
            metafieldMappings={metafieldMappings}
            setMetafieldMappings={setMetafieldMappings}
            // Pass down constants for the flat field list
            fieldConstants={{
                FIELD_DESCRIPTION_HTML, FIELD_VENDOR, FIELD_HANDLE,
                FIELD_PRODUCT_TYPE, FIELD_TAGS, FIELD_STATUS, FIELD_SEO_TITLE,
                FIELD_SEO_DESCRIPTION, FIELD_PUBLISHED_AT, FIELD_REQUIRES_SELLING_PLAN,
                FIELD_TEMPLATE_SUFFIX,
                // Added flat fields
                FIELD_SKU, FIELD_BARCODE, FIELD_PRICE, FIELD_COMPARE_AT_PRICE,
                FIELD_WEIGHT, FIELD_WEIGHT_UNIT, FIELD_INVENTORY_POLICY,
                FIELD_INVENTORY_QUANTITY, FIELD_INVENTORY_MANAGEMENT, FIELD_TAXABLE,
                FIELD_TAX_CODE, FIELD_HARMONIZED_SYSTEM_CODE, FIELD_REQUIRES_SHIPPING,
                FIELD_COST,
             }}
            // Other necessary props
            mappingOptions={mappingOptions}
            remoteData={remoteData}
            processedPreviewData={processedPreviewData}
          />
        );
      case 3:
        return (
          <WizardStepSchedule
            stepTitle={steps[3]}
            frequency={frequency}
            setFrequency={setFrequency}
            frequencyId={frequencyId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Page title={initialData ? 'Edit Integration' : 'Create New Integration'} subtitle="Set up a connection to sync data with Shopify">
      <Layout>
        <Layout.Section>
          <WizardStepsIndicator steps={steps} currentStep={step} />
        </Layout.Section>

        <Layout.Section>
          <Card>{renderStepContent()}</Card>
        </Layout.Section>

        <Layout.Section>
          <Box paddingBlockEnd="400">
            <WizardActions
              onBack={handleBack}
              onNext={handleNext}
              onSubmit={handleSubmit}
              currentStep={step}
              totalSteps={steps.length}
              isNextDisabled={isNextDisabled}
              isLoading={isConnectionStepLoading}
              isEditing={!!initialData} // Pass whether we are editing
            />
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  )
}

export default IntegrationWizard 