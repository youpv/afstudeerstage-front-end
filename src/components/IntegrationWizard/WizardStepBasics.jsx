/**
 * Renders the UI for the "Basics" step.
 * @param {{
 *  name: string,
 *  setName: (value: string) => void,
 *  nameId: string,
 *  connectionType: string,
 *  setConnectionType: (value: string) => void,
 *  stepTitle: string
 * }} props
 */
function WizardStepBasics({
  name,
  setName,
  nameId,
  connectionType,
  setConnectionType,
  stepTitle
}) {
  const connectionTypeChoices = [
    { label: 'FTP Server', value: 'ftp', helpText: 'Connect to an FTP server to fetch data files.' },
    {
      label: 'Business Central 365 (Coming Soon)',
      value: 'bc',
      disabled: true,
      helpText: 'Direct connection to Microsoft Dynamics 365 Business Central.'
    },
  ];

  // Style object for padding, assuming 'var(--p-space-400)' was a Polaris variable
  // You might need to replace this with your actual CSS variable or a pixel value
  const paddingStyle = { padding: '16px' }; // Example: 16px as a fallback for var(--p-space-400)

  return (
    <div style={paddingStyle}> {/* Replaces Card and outer structure */} 
        <div> {/* Replaces Card.Section and BlockStack */} 
          <h2>{stepTitle}</h2> {/* Replaces Text component */} 
          
          <div> {/* Container for the name field */} 
            <label htmlFor={nameId}>Integration Name</label>
            <input
              type="text"
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)} // Standard input onChange
              autoComplete="off"
            />
            <p><small>Give your integration a memorable name (e.g., 'ERP Product Sync').</small></p>
          </div>

          <hr /> {/* Replaces Divider */} 

          <fieldset> {/* Replaces ChoiceList (partially) */} 
            <legend>Source Type</legend>
            {connectionTypeChoices.map(choice => (
              <div key={choice.value}>
                <input
                  type="radio"
                  id={`${nameId}-choice-${choice.value}`}
                  name={`${nameId}-sourceType`} // Group radio buttons
                  value={choice.value}
                  checked={connectionType === choice.value}
                  onChange={(e) => setConnectionType(e.target.value)} // Standard radio onChange
                  disabled={choice.disabled}
                />
                <label htmlFor={`${nameId}-choice-${choice.value}`}>{choice.label}</label>
                {choice.helpText && <p><small>{choice.helpText}</small></p>}
              </div>
            ))}
          </fieldset>
        </div>
    </div>
  );
}

export default WizardStepBasics; 