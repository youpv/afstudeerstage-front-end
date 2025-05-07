import { useMemo } from 'react';
import React from 'react';

// --- Helper Functions ---

// Helper function to render value (handles arrays, objects, null/undefined)
const renderValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') {
      return <span style={{ fontStyle: 'italic', color: 'gray' }}>_empty_</span>;
  }
  if (Array.isArray(value)) {
    const displayItems = value.slice(0, 5); 
    const truncated = value.length > 5 ? '...' : '';
    return `[${displayItems.join(', ')}${truncated}]`;
  } else if (typeof value === 'object' && value !== null) {
    try {
      const jsonString = JSON.stringify(value);
      if (jsonString.length > 100) {
        return jsonString.substring(0, 100) + '...';
      }
      return jsonString;
    } catch (e) {
      console.warn('[WizardStepPreview] Error stringifying object:', e);
      return '[Object]';
    }
  }
  return String(value);
};

// Helper to create definition list items, skipping empty values
const createDefinitionListItems = (itemsObject) => {
    return Object.entries(itemsObject)
        .filter(([/* key */, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .map(([key, value]) => (
            <React.Fragment key={key}> 
              <dt>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</dt>
              <dd>{renderValue(value)}</dd>
            </React.Fragment>
        ));
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

  const handlePrevious = () => {
    setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1));
  };

  const handleNext = () => {
    setCurrentPreviewIndex(Math.min(totalItems - 1, currentPreviewIndex + 1));
  };

  const canNavigate = isArray && totalItems > 1;
  const canGoPrevious = canNavigate && currentPreviewIndex > 0;
  const canGoNext = canNavigate && currentPreviewIndex < totalItems - 1;

  const {
      title,
      status,
      bodyHtml,
      vendor,
      productType,
      tags,
      seo, 
      inventoryItem, 
      metafields,
      publishedAt,
      requiresSellingPlan,
      templateSuffix,
      handle,
      error: mappingError,
      info: mappingInfo,
      ...otherTopLevelData
  } = mappedPreviewData && typeof mappedPreviewData === 'object' ? mappedPreviewData : {};

  const hasBasicInfo = title || status || bodyHtml;
  
  const detailsItems = createDefinitionListItems({ vendor, productType, handle });

  const displayTags = useMemo(() => {
      if (Array.isArray(tags)) {
          return tags.filter(tag => tag && String(tag).trim());
      } else if (typeof tags === 'string' && tags.trim() !== '') {
          return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
      return [];
  }, [tags]);

  const inventoryData = inventoryItem || {};
  const inventoryPriceItems = createDefinitionListItems({
      price: inventoryData.price,
      compareAtPrice: inventoryData.compareAtPrice,
      cost: inventoryData.cost,
      sku: inventoryData.sku,
      barcode: inventoryData.barcode,
  });
  const inventoryStockItems = createDefinitionListItems({
      inventoryQuantity: inventoryData.inventoryQuantity,
      inventoryPolicy: inventoryData.inventoryPolicy,
      inventoryManagement: inventoryData.inventoryManagement,
  });

  const shippingWeightItems = createDefinitionListItems({
      weight: inventoryData.weight,
      weightUnit: inventoryData.weightUnit,
      requiresShipping: inventoryData.requiresShipping,
      harmonizedSystemCode: inventoryData.harmonizedSystemCode,
  });

  const taxItems = createDefinitionListItems({
      taxable: inventoryData.taxable,
      taxCode: inventoryData.taxCode,
  });

  const seoData = seo || {};
  const seoItems = createDefinitionListItems({
      title: seoData.title,
      description: seoData.description
  });

  const groupedMetafields = useMemo(() => {
    if (!metafields || !Array.isArray(metafields) || metafields.length === 0) return {};
    return metafields.reduce((acc, mf) => {
        if (mf && typeof mf === 'object' && mf.key && mf.namespace) {
            const ns = mf.namespace || 'custom'; 
            if (!acc[ns]) {
                acc[ns] = [];
            }
            acc[ns].push(mf);
        }
        return acc;
    }, {});
  }, [metafields]);
  const hasMetafields = Object.keys(groupedMetafields).length > 0;

  const otherDataItems = createDefinitionListItems({
      publishedAt,
      requiresSellingPlan,
      templateSuffix,
      ...otherTopLevelData 
  });

  let statusText = status ? String(status).toUpperCase() : 'UNKNOWN';
  let statusStyle = { padding: '0.1rem 0.4rem', borderRadius: '3px', display: 'inline-block', fontSize: '0.8rem' };
  switch (String(status).toLowerCase()) {
      case 'active': statusStyle.backgroundColor = 'lightgreen'; statusStyle.color = 'darkgreen'; break;
      case 'archived': statusStyle.backgroundColor = 'lightcoral'; statusStyle.color = 'darkred'; break;
      case 'draft':
      default: statusStyle.backgroundColor = 'lightgoldenrodyellow'; statusStyle.color = 'darkgoldenrod'; break;
  }

  const hasDisplayableContent = hasBasicInfo || detailsItems.length > 0 || displayTags.length > 0 ||
                              inventoryPriceItems.length > 0 || inventoryStockItems.length > 0 ||
                              shippingWeightItems.length > 0 || taxItems.length > 0 || seoItems.length > 0 ||
                              hasMetafields || otherDataItems.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2>{stepTitle}</h2>
      <p style={{ color: 'gray'}}>
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
      </p>

      {canNavigate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
          <span style={{ fontWeight: 'bold' }}>Browse Products:</span>
          <div>
            <button
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              style={{ marginRight: '0.5rem' }}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!canGoNext}
            >
              Next
            </button>
          </div>
          {totalItems > 0 && (
            <span style={{ fontSize: '0.9rem', marginLeft: 'auto' }}>{`${currentPreviewIndex + 1} / ${totalItems}`}</span>
          )}
        </div>
      )}

      {mappingError && <div style={{ color: 'red', border: '1px solid red', padding: '0.5rem'}}>Error: {mappingError}</div>}
      {mappingInfo && !mappingError && <div style={{ color: 'blue', border: '1px solid blue', padding: '0.5rem'}}>Info: {mappingInfo}</div>}
      
      {!mappingError && !mappingInfo && (
        <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
            {hasBasicInfo && (
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee'}}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {title && <h3 style={{ margin: '0 0 0.5rem 0' }}>{renderValue(title)}</h3>}
                        {status && <span style={statusStyle}>{statusText}</span>}
                   </div>
                   {bodyHtml && (
                       <div style={{ marginTop: '0.5rem' }}>
                           <h4>Description (HTML)</h4>
                           <div dangerouslySetInnerHTML={{ __html: bodyHtml }} style={{ border: '1px dashed #eee', padding: '0.5rem', maxHeight: '200px', overflowY: 'auto' }} />
                       </div>
                   )}
                </div>
            )}

            {detailsItems.length > 0 && (
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee'}}>
                    <h4>Details</h4>
                    <dl style={{ margin: 0, paddingLeft: '1rem' }}>{detailsItems}</dl>
                </div>
            )}

            {displayTags.length > 0 && (
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee'}}>
                    <h4>Tags</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {displayTags.map((tag, index) => <span key={index} style={{ border: '1px solid #ddd', padding: '0.2rem 0.5rem', borderRadius: '3px', backgroundColor: '#f9f9f9'}}>{renderValue(tag)}</span>)}
                    </div>
                </div>
            )}

            {(inventoryPriceItems.length > 0 || inventoryStockItems.length > 0) && (
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee'}}>
                    <h4>Pricing & Inventory</h4>
                    {inventoryPriceItems.length > 0 && <dl style={{ margin: '0 0 0.5rem 1rem', padding: 0 }}>{inventoryPriceItems}</dl>}
                    {inventoryStockItems.length > 0 && <dl style={{ margin: '0 0 0.5rem 1rem', padding: 0 }}>{inventoryStockItems}</dl>}
                </div>
            )}

            {shippingWeightItems.length > 0 && (
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee'}}>
                    <h4>Shipping & Weight</h4>
                    <dl style={{ margin: 0, paddingLeft: '1rem' }}>{shippingWeightItems}</dl>
                </div>
            )}

            {taxItems.length > 0 && (
                 <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee'}}>
                    <h4>Tax</h4>
                    <dl style={{ margin: 0, paddingLeft: '1rem' }}>{taxItems}</dl>
                </div>
            )}

            {seoItems.length > 0 && (
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee'}}>
                    <h4>SEO</h4>
                    <dl style={{ margin: 0, paddingLeft: '1rem' }}>{seoItems}</dl>
                </div>
            )}

            {hasMetafields && (
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee'}}>
                    <h4>Metafields</h4>
                    {Object.entries(groupedMetafields).map(([namespace, fields]) => (
                        <div key={namespace} style={{ marginLeft: '1rem', marginBottom: '0.5rem'}}>
                            <h5>Namespace: {namespace}</h5>
                            <dl style={{ margin: 0, paddingLeft: '1rem'}}>
                                {fields.map(mf => (
                                    <React.Fragment key={`${mf.namespace}-${mf.key}`}>
                                        <dt>{mf.key}</dt>
                                        <dd>{renderValue(mf.value)}</dd>
                                    </React.Fragment>
                                ))}
                            </dl>
                        </div>
                    ))}
                </div>
            )}

            {otherDataItems.length > 0 && (
                 <div>
                    <h4>Other Data</h4>
                    <dl style={{ margin: 0, paddingLeft: '1rem' }}>{otherDataItems}</dl>
                </div>
            )}

            {!hasDisplayableContent && (
                <p style={{ fontStyle: 'italic', color: 'gray'}}>No mapped data available to preview for this item.</p>
            )}
        </div>
      )}
    </div>
  );
}

export default WizardStepPreview; 