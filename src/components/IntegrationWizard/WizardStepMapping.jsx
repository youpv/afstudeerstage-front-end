import { useState, useCallback, useMemo, useEffect } from 'react'
// import { suggestMappings, DEFAULT_MAPPING_SYSTEM_PROMPT } from '../../services/openai-client'

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

  // Popover state is no longer needed in the same way
  // const [popoverActive, setPopoverActive] = useState(false);
  // const togglePopoverActive = useCallback(() => setPopoverActive((active) => !active), []);
  const [showManageOptionalFields, setShowManageOptionalFields] = useState(false);

  const [showAddMetafieldForm, setShowAddMetafieldForm] = useState(false);
  const [addFormMappingType, setAddFormMappingType] = useState('single');
  const [newMetafieldSourceKey, setNewMetafieldSourceKey] = useState('');
  const [newMetafieldNamespace, setNewMetafieldNamespace] = useState('custom');
  const [newMetafieldKey, setNewMetafieldKey] = useState('');
  const [newMetafieldType, setNewMetafieldType] = useState(METAFIELD_TYPES[0].value);
  const [newArrayKeySource, setNewArrayKeySource] = useState('');
  const [newArrayValueSource, setNewArrayValueSource] = useState('');
  const [arrayObjectKeys, setArrayObjectKeys] = useState([]);

  // const [isAiMappingLoading, setIsAiMappingLoading] = useState(false);
  // const [aiMappingError, setAiMappingError] = useState('');

  // Effect to check selected source data type
  useEffect(() => {
    if (newMetafieldSourceKey && processedPreviewData) {
      const selectedData = processedPreviewData[newMetafieldSourceKey];
      if (isArrayOfObjects(selectedData)) {
        setAddFormMappingType('dynamic_from_array');
        const keys = getKeysFromFirstObjectInArray(selectedData);
        setArrayObjectKeys(keys);
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
        setNewArrayKeySource('');
        setNewArrayValueSource('');
      }
    } else {
      setAddFormMappingType('single');
      setArrayObjectKeys([]);
      setNewArrayKeySource('');
      setNewArrayValueSource('');
    }
  }, [newMetafieldSourceKey, processedPreviewData]);

  const allOptionalFieldsConfig = useMemo(() => {
    const config = {};
    const createSetter = (fieldConstName) => (value) => {
      setOptionalFieldKeys(prev => ({ ...prev, [fieldConstName]: value }));
    };
    for (const fieldConstName in fieldConstants) {
        if (Object.prototype.hasOwnProperty.call(fieldConstants, fieldConstName)) {
            const fieldValue = fieldConstants[fieldConstName];
            let label = 'Unknown Field';
            let helpText = 'Map this field.';
            const id = `${fieldValue}Key`;
            switch (fieldConstName) {
                case 'FIELD_DESCRIPTION_HTML': label = 'Description (HTML)'; helpText = 'Map to the product description (HTML is supported).'; break;
                case 'FIELD_VENDOR': label = 'Vendor'; helpText = 'Map to the brand or vendor name.'; break;
                case 'FIELD_HANDLE': label = 'Handle'; helpText = 'Map to the unique URL handle (e.g., product-name).'; break;
                case 'FIELD_PRODUCT_TYPE': label = 'Product Type'; helpText = 'Map to product type (e.g., T-Shirt, Mug).'; break;
                case 'FIELD_TAGS': label = 'Tags'; helpText = 'Map to a comma-separated list or array of tags.'; break;
                case 'FIELD_STATUS': label = 'Status'; helpText = 'Map to product status (ACTIVE, ARCHIVED, DRAFT).'; break;
                case 'FIELD_SEO_TITLE': label = 'SEO Title'; helpText = 'Map to the search engine title.'; break;
                case 'FIELD_SEO_DESCRIPTION': label = 'SEO Description'; helpText = 'Map to the search engine description.'; break;
                case 'FIELD_PUBLISHED_AT': label = 'Published At'; helpText = 'Map to the publication date/time (ISO 8601 format).'; break;
                case 'FIELD_REQUIRES_SELLING_PLAN': label = 'Requires Selling Plan'; helpText = 'Map to a boolean (true/false) indicating if a selling plan is required.'; break;
                case 'FIELD_TEMPLATE_SUFFIX': label = 'Template Suffix'; helpText = 'Map to the theme template suffix.'; break;
                case 'FIELD_SKU': label = 'SKU'; helpText = 'Map to the Stock Keeping Unit.'; break;
                case 'FIELD_BARCODE': label = 'Barcode'; helpText = 'Map to the product barcode (ISBN, UPC, GTIN, etc.).'; break;
                case 'FIELD_PRICE': label = 'Price'; helpText = 'Map to the product price.'; break;
                case 'FIELD_COMPARE_AT_PRICE': label = 'Compare At Price'; helpText = 'Map to the product\'s original price before a sale.'; break;
                case 'FIELD_WEIGHT': label = 'Weight'; helpText = 'Map to the product weight. Ensure unit consistency or use FIELD_WEIGHT_UNIT.'; break;
                case 'FIELD_WEIGHT_UNIT': label = 'Weight Unit'; helpText = 'Map to the unit of weight (e.g., kg, lb, oz, g).'; break;
                case 'FIELD_INVENTORY_POLICY': label = 'Inventory Policy'; helpText = 'Map to inventory policy (DENY or CONTINUE).'; break;
                case 'FIELD_INVENTORY_QUANTITY': label = 'Inventory Quantity'; helpText = 'Map to the available stock quantity.'; break;
                case 'FIELD_INVENTORY_MANAGEMENT': label = 'Inventory Management'; helpText = 'Map to inventory management type (e.g., SHOPIFY, NOT_MANAGED).'; break;
                case 'FIELD_TAXABLE': label = 'Taxable'; helpText = 'Map to a boolean (true/false) if the product is taxable.'; break;
                case 'FIELD_TAX_CODE': label = 'Tax Code'; helpText = 'Map to the Avalara tax code or similar.'; break;
                case 'FIELD_HARMONIZED_SYSTEM_CODE': label = 'Harmonized System Code'; helpText = 'Map to the HS code for international shipping.'; break;
                case 'FIELD_REQUIRES_SHIPPING': label = 'Requires Shipping'; helpText = 'Map to a boolean (true/false) if the product requires shipping.'; break;
                case 'FIELD_COST': label = 'Cost of Goods'; helpText = 'Map to the cost of the product.'; break;
                default: label = fieldValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); break;
            }
            config[fieldConstName] = {
                id,
                label,
                value: optionalFieldKeys[fieldConstName] || '',
                onChange: createSetter(fieldConstName),
                options: mappingOptions,
                helpText,
                baseField: fieldValue // The actual Shopify field name like 'vendor'
            };
        }
    }
    return config;
  }, [optionalFieldKeys, setOptionalFieldKeys, mappingOptions, fieldConstants]);

  const availableOptionalFieldsToAdd = useMemo(() => {
    return Object.keys(allOptionalFieldsConfig).filter(key => !activeOptionalFields.includes(key));
  }, [allOptionalFieldsConfig, activeOptionalFields]);

  const handleAddOptionalField = useCallback((fieldKey) => {
    setActiveOptionalFields(prev => [...prev, fieldKey]);
    setShowManageOptionalFields(false); // Close manager after adding
  }, [setActiveOptionalFields]);

  const handleRemoveOptionalField = useCallback((fieldKeyToRemove) => {
    setActiveOptionalFields(prev => prev.filter(key => key !== fieldKeyToRemove));
    // Also clear the mapping for this field
    setOptionalFieldKeys(prev => {
      const updated = { ...prev };
      delete updated[fieldKeyToRemove];
      return updated;
    });
  }, [setActiveOptionalFields, setOptionalFieldKeys]);

  const handleAddMetafieldMapping = () => {
    if (addFormMappingType === 'single' && (!newMetafieldSourceKey || !newMetafieldNamespace || !newMetafieldKey || !newMetafieldType)) {
        alert('For single mapping, all fields (Source, Namespace, Key, Type) are required.');
        return;
    }
    if (addFormMappingType === 'dynamic_from_array' && (!newMetafieldSourceKey || !newMetafieldNamespace || !newMetafieldKey || !newMetafieldType || !newArrayKeySource || !newArrayValueSource)) {
        alert('For dynamic array mapping, all fields including Array Key Source and Array Value Source are required.');
        return;
    }

    setMetafieldMappings(prev => [...prev, {
      id: Date.now().toString(), // Simple unique ID
      mappingType: addFormMappingType,
      sourceKey: newMetafieldSourceKey,
      metafieldNamespace: newMetafieldNamespace,
      metafieldKey: newMetafieldKey, // This is the base key for dynamic
      metafieldType: newMetafieldType, // This is the base type for dynamic
      arrayKeySource: addFormMappingType === 'dynamic_from_array' ? newArrayKeySource : undefined,
      arrayValueSource: addFormMappingType === 'dynamic_from_array' ? newArrayValueSource : undefined,
    }]);
    resetAddMetafieldForm();
    setShowAddMetafieldForm(false);
  };

  const resetAddMetafieldForm = () => {
    setNewMetafieldSourceKey('');
    setNewMetafieldNamespace('custom');
    setNewMetafieldKey('');
    setNewMetafieldType(METAFIELD_TYPES[0].value);
    setShowAddMetafieldForm(false);
    setAddFormMappingType('single');
    setNewArrayKeySource('');
    setNewArrayValueSource('');
    setArrayObjectKeys([]);
  };

  const handleRemoveMetafieldMapping = (idToRemove) => {
    setMetafieldMappings(prev => prev.filter(m => m.id !== idToRemove));
  };

  const mappingOptionsWithEmpty = useMemo(() => [{ label: '--- Select Source Field ---', value: '' }, ...mappingOptions], [mappingOptions]);
  const arrayObjectKeysWithEmpty = useMemo(() => [{ label: '--- Select Key ---', value: '' }, ...arrayObjectKeys], [arrayObjectKeys]);

  // Prepare values for display in source data column
  const sourceDataValuesPreview = useMemo(() => {
    if (!processedPreviewData) return {};
    const preview = {};
    mappingOptions.forEach(opt => {
      if (processedPreviewData && typeof processedPreviewData === 'object' && opt.value in processedPreviewData) {
        preview[opt.value] = truncateString(JSON.stringify(processedPreviewData[opt.value]), 50);
      } else {
        preview[opt.value] = '_not found_';
      }
    });
    return preview;
  }, [processedPreviewData, mappingOptions]);

  return (
    <>
      <style>{`
        .available-fields-section {
          border: 1px solid #e1e3e5; /* Lighter border */
          padding: 1rem; /* More padding */
          margin-bottom: 1rem;
          border-radius: 4px; /* Rounded corners */
          background-color: #f9fafb; /* Subtle background */
        }
        .available-fields-section h4 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1rem; /* Slightly larger title */
          color: #202223; /* Shopify admin text color */
        }
        .available-fields-section .field-item {
          display: flex; /* Align checkbox and label */
          align-items: center; /* Vertically align */
          margin: 0.5rem 0; /* More vertical spacing */
          padding: 0.25rem;
        }
        .available-fields-section .field-item input[type="checkbox"] {
          margin-right: 0.75rem; /* More space after checkbox */
          width: 16px; /* Custom checkbox size */
          height: 16px;
          accent-color: #0070c0; /* Shopify blue for checkbox */
        }
        .available-fields-section .field-item label {
          font-size: 0.9rem;
          color: #5c5f62;
        }
        .available-fields-section .no-fields-message {
          font-size: 0.85rem;
          color: #5c5f62;
          font-style: italic;
        }
      `}</style>
      <div>
        <div style={{ padding: 'var(--p-space-400)' }}>
          <div>
            <h2>{stepTitle}</h2>
            
            <div>
              <p>
                Map the fields from your data source to the corresponding Shopify
                product fields. The 'Product Title' is required. Use the buttons
                below to add optional standard fields or custom metafield mappings.
                The list on the right shows available source fields and their mapped status.
              </p>
            </div>

            {mappingOptions.length === 0 ? (
              <div className="banner warning">
                <h4>Warning</h4>
                <p>
                  {remoteData === null
                    ? 'Go back to the Connection step and test/fetch data first.'
                    : "No mappable fields found in the data at the specified path. Check the 'Data Path' in the Connection step or the structure of your source file."}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #eee' }}>
                    <h3>Product Title (Required)</h3>
                    <div>
                      <label htmlFor={titleKeyId} style={{ display: 'block', marginBottom: '0.25rem' }}>Source Field for Title</label>
                      <select
                        id={titleKeyId}
                        value={titleKey || ''}
                        onChange={(e) => setTitleKey(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem' }}
                      >
                        {mappingOptionsWithEmpty.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      {!titleKey && mappingOptions.length > 0 && (
                          <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.25rem' }}>Product Title mapping is required.</p>
                      )}
                      {titleKey && processedPreviewData && processedPreviewData[titleKey] !== undefined && (
                          <p style={{ fontSize: '0.8rem', color: 'gray', marginTop: '0.25rem' }}>
                              Preview: {truncateString(JSON.stringify(processedPreviewData[titleKey]), 50)}
                          </p>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #eee' }}>
                    <h3>Optional Standard Fields</h3>
                    <button onClick={() => setShowManageOptionalFields(!showManageOptionalFields)} style={{ marginBottom: '0.5rem' }}>
                      {showManageOptionalFields ? 'Hide' : 'Add / Manage Optional Fields'}
                    </button>
                    {showManageOptionalFields && (
                      <div className="available-fields-section">
                        <h4>Available fields to add:</h4>
                        {availableOptionalFieldsToAdd.length > 0 ? (
                          availableOptionalFieldsToAdd.map(fieldKey => {
                            const config = allOptionalFieldsConfig[fieldKey];
                            return (
                              <div key={fieldKey} className="field-item">
                                <input
                                  type="checkbox"
                                  id={`add-opt-${fieldKey}`}
                                  onChange={() => handleAddOptionalField(fieldKey)}
                                />
                                <label htmlFor={`add-opt-${fieldKey}`}>{config.label}</label>
                              </div>
                            );
                          })
                        ) : (
                          <p className="no-fields-message"><small>All optional fields have been added or are active.</small></p>
                        )}
                      </div>
                    )}

                    {activeOptionalFields.length > 0 && <h4>Active optional fields:</h4>}
                    {activeOptionalFields.map(fieldKey => {
                      const config = allOptionalFieldsConfig[fieldKey];
                      if (!config) return null;
                      return (
                        <div key={config.id} style={{ border: '1px solid #f0f0f0', padding: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <label htmlFor={config.id} style={{ fontWeight: 'bold'}}>{config.label}</label>
                            <button onClick={() => handleRemoveOptionalField(fieldKey)} style={{fontSize: '0.8rem'}}>Remove</button>
                          </div>
                          <select
                            id={config.id}
                            value={config.value || ''}
                            onChange={(e) => config.onChange(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                          >
                            {mappingOptionsWithEmpty.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                          <p style={{ fontSize: '0.8rem', color: 'gray', marginTop: '0.25rem' }}>{config.helpText}</p>
                          {config.value && processedPreviewData && processedPreviewData[config.value] !== undefined && (
                              <p style={{ fontSize: '0.8rem', color: 'gray'}}>
                                  <em>Preview: {truncateString(JSON.stringify(processedPreviewData[config.value]), 50)}</em>
                              </p>
                          )}
                        </div>
                      );
                    })}
                    {activeOptionalFields.length === 0 && !showManageOptionalFields && (
                       <p><small>No optional fields mapped yet. Click "Add / Manage Optional Fields" to add them.</small></p>
                    )}
                  </div>

                  <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                      <h3>Custom Metafield Mappings</h3>
                      <button onClick={() => { setShowAddMetafieldForm(true); resetAddMetafieldForm(); }}>
                        Add Metafield Mapping
                      </button>
                    </div>

                    {showAddMetafieldForm && (
                      <div style={{ border: '1px solid #ddd', padding: '1rem', margin: '1rem 0' }}>
                        <h4>New Metafield Mapping</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                          <div>
                            <label htmlFor="newMetafieldSourceKey" style={{display: 'block'}}>Source Data Field</label>
                            <select id="newMetafieldSourceKey" value={newMetafieldSourceKey} onChange={(e) => setNewMetafieldSourceKey(e.target.value)} style={{width: '100%', padding: '0.5rem'}}>
                              {mappingOptionsWithEmpty.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            {processedPreviewData && newMetafieldSourceKey && processedPreviewData[newMetafieldSourceKey] !== undefined && (
                               <p><small>Preview: {truncateString(JSON.stringify(processedPreviewData[newMetafieldSourceKey]), 100)}</small></p>
                            )}
                          </div>
                          
                          {newMetafieldSourceKey && processedPreviewData && isArrayOfObjects(processedPreviewData[newMetafieldSourceKey]) && (
                              <div style={{border: '1px dashed #ccc', padding: '0.5rem'}}>
                                  <p style={{fontSize: '0.9rem', fontWeight: 'bold'}}>This source is an array of objects. Map dynamically:</p>
                                  <div>
                                      <label htmlFor="newArrayKeySource" style={{display: 'block'}}>Source for Metafield Key Suffix</label>
                                      <select id="newArrayKeySource" value={newArrayKeySource} onChange={e => setNewArrayKeySource(e.target.value)} style={{width: '100%', padding: '0.5rem'}}>
                                          {arrayObjectKeysWithEmpty.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                      </select>
                                      <p><small>Field within each array object to form the metafield key.</small></p>
                                  </div>
                                  <div>
                                      <label htmlFor="newArrayValueSource" style={{display: 'block'}}>Source for Metafield Value</label>
                                      <select id="newArrayValueSource" value={newArrayValueSource} onChange={e => setNewArrayValueSource(e.target.value)} style={{width: '100%', padding: '0.5rem'}}>
                                          {arrayObjectKeysWithEmpty.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                      </select>
                                       <p><small>Field within each array object for the metafield value.</small></p>
                                  </div>
                              </div>
                          )}

                          <div>
                            <label htmlFor="newMetafieldNamespace" style={{display: 'block'}}>Metafield Namespace</label>
                            <input type="text" id="newMetafieldNamespace" value={newMetafieldNamespace} onChange={(e) => setNewMetafieldNamespace(e.target.value)} placeholder="e.g., custom, instructions" style={{width: 'calc(100% - 1rem)', padding: '0.5rem'}}/>
                             <p><small>Usually 'custom' or a specific app namespace.</small></p>
                          </div>
                          <div>
                            <label htmlFor="newMetafieldKey" style={{display: 'block'}}>Metafield Key {addFormMappingType === 'dynamic_from_array' ? '(Base)' : ''}</label>
                            <input type="text" id="newMetafieldKey" value={newMetafieldKey} onChange={(e) => setNewMetafieldKey(e.target.value)} placeholder={addFormMappingType === 'dynamic_from_array' ? "e.g., property" : "e.g., material_type"} style={{width: 'calc(100% - 1rem)', padding: '0.5rem'}}/>
                             <p><small>{addFormMappingType === 'dynamic_from_array' ? "Base key, will be combined with Array Key Source." : "Unique key within the namespace."}</small></p>
                          </div>
                          <div>
                            <label htmlFor="newMetafieldType" style={{display: 'block'}}>Metafield Type {addFormMappingType === 'dynamic_from_array' ? '(Base for array items)' : ''}</label>
                            <select id="newMetafieldType" value={newMetafieldType} onChange={(e) => setNewMetafieldType(e.target.value)} style={{width: '100%', padding: '0.5rem'}}>
                              {METAFIELD_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </div>
                          <div style={{marginTop: '0.5rem'}}>
                            <button onClick={handleAddMetafieldMapping} style={{marginRight: '0.5rem'}}>Add This Mapping</button>
                            <button onClick={resetAddMetafieldForm}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {metafieldMappings.length > 0 && <h4>Active metafield mappings:</h4>}
                    {metafieldMappings.map(m => (
                      <div key={m.id} style={{ border: '1px solid #f0f0f0', padding: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h5 style={{margin: '0'}}>Metafield: {m.metafieldNamespace}.{m.metafieldKey}{m.mappingType === 'dynamic_from_array' ? ' (dynamic)': ''}</h5>
                            <button onClick={() => handleRemoveMetafieldMapping(m.id)} style={{fontSize: '0.8rem'}}>Remove</button>
                        </div>
                        <p style={{fontSize: '0.8rem'}}>Source: {m.sourceKey} ({truncateString(JSON.stringify(processedPreviewData?.[m.sourceKey]), 50)})</p>
                        <p style={{fontSize: '0.8rem'}}>Type: {METAFIELD_TYPES.find(t => t.value === m.metafieldType)?.label || m.metafieldType}</p>
                        {m.mappingType === 'dynamic_from_array' && (
                            <div style={{fontSize: '0.8rem', marginLeft: '1rem'}}>
                                <p>Key Suffix From: {m.arrayKeySource}</p>
                                <p>Value From: {m.arrayValueSource}</p>
                            </div>
                        )}
                      </div>
                    ))}
                    {metafieldMappings.length === 0 && !showAddMetafieldForm && (
                      <p><small>No custom metafields mapped yet.</small></p>
                    )}
                  </div>
                </div>

                <div style={{ border: '1px solid #ccc', padding: '1rem', maxHeight: '80vh', overflowY: 'auto' }}>
                  <h3>Source Data Fields & Values</h3>
                  {mappingOptions.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {mappingOptions.map(opt => (
                        <li key={opt.value} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #eee' }}>
                          <strong style={{display: 'block'}}>{opt.label}</strong>
                          <code style={{ fontSize: '0.8rem', color: '#333', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '100px', overflowY: 'auto', backgroundColor: '#f9f9f9', padding: '0.25rem' }}>
                            {sourceDataValuesPreview[opt.value] !== undefined 
                                ? sourceDataValuesPreview[opt.value] 
                                : '_not in current data_'}
                          </code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No source data fields available.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default WizardStepMapping 