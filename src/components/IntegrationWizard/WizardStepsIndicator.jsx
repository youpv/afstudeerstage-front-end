import { Badge, InlineStack } from '@shopify/polaris'

/**
 * Renders the progress indicator badges for the wizard steps.
 * @param {{ steps: string[], currentStep: number }} props
 */
function WizardStepsIndicator({ steps, currentStep }) {
  return (
    <InlineStack gap="200" wrap={false}>
      {steps.map((label, idx) => {
        const isCompleted = idx < currentStep
        const isCurrent = idx === currentStep
        const progress = isCompleted
          ? 'complete'
          : isCurrent
          ? 'partiallyComplete'
          : 'incomplete'
        const tone = isCompleted ? 'success' : isCurrent ? 'attention' : undefined
        return (
          <Badge key={label} tone={tone} progress={progress}>
            {label}
          </Badge>
        )
      })}
    </InlineStack>
  )
}

export default WizardStepsIndicator 