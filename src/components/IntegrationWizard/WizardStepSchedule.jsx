import { BlockStack, FormLayout, Select, Text } from '@shopify/polaris'

/**
 * Renders the UI for the "Schedule" step.
 * @param {{
 *  stepTitle: string,
 *  frequency: string,
 *  setFrequency: (value: string) => void,
 *  frequencyId: string
 * }} props
 */
function WizardStepSchedule({
  stepTitle,
  frequency,
  setFrequency,
  frequencyId,
}) {
  return (
    <BlockStack gap="400" inlineAlign="start">
      <div style={{ padding: 'var(--p-space-400)' }}>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            {stepTitle}
          </Text>
          <FormLayout>
            <Select
              id={frequencyId}
              label="Sync Frequency"
              options={[
                { label: 'Every Hour', value: '1' },
                { label: 'Every 12 Hours', value: '12' },
                { label: 'Daily (Every 24 Hours)', value: '24' },
              ]}
              value={frequency}
              onChange={setFrequency}
              helpText="How often should the integration check for updates?"
            />
          </FormLayout>
        </BlockStack>
      </div>
    </BlockStack>
  )
}

export default WizardStepSchedule 