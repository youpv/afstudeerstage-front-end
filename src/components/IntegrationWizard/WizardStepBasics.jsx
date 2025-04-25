import {
  BlockStack,
  FormLayout,
  TextField,
  ChoiceList,
  Text,
} from '@shopify/polaris'

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
  return (
    <BlockStack gap="400" inlineAlign="start">
      <div style={{ padding: 'var(--p-space-400)' }}>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">{stepTitle}</Text>
          <FormLayout>
            <TextField
              id={nameId}
              label="Integration Name"
              value={name}
              onChange={setName}
              autoComplete="off"
              helpText="Give your integration a memorable name (e.g., 'ERP Product Sync')."
            />
            <ChoiceList
              title="Source Type"
              choices={[
                { label: 'FTP Server', value: 'ftp', helpText: 'Connect to an FTP server to fetch data files.' },
                {
                  label: 'Business Central 365 (Coming Soon)',
                  value: 'bc',
                  disabled: true,
                  helpText: 'Direct connection to Microsoft Dynamics 365 Business Central.'
                },
              ]}
              selected={[connectionType]}
              onChange={([value]) => setConnectionType(value)}
            />
          </FormLayout>
        </BlockStack>
      </div>
    </BlockStack>
  )
}

export default WizardStepBasics 