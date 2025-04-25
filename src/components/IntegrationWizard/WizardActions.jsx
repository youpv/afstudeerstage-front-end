import { Button, InlineStack } from '@shopify/polaris'

/**
 * Renders the Back/Next/Finish action buttons for the wizard.
 * @param {{
 *   onBack: () => void,
 *   onNext: () => void,
 *   onSubmit: () => void,
 *   currentStep: number,
 *   totalSteps: number,
 *   isNextDisabled: boolean,
 *   isLoading: boolean
 * }} props
 */
function WizardActions({
  onBack,
  onNext,
  onSubmit,
  currentStep,
  totalSteps,
  isNextDisabled,
  isLoading,
  isEditing // New prop to change the finish button text
}) {
  return (
    <InlineStack align="end" gap="200">
      <Button onClick={onBack} disabled={currentStep === 0 || isLoading}>
        Back
      </Button>
      {currentStep === totalSteps - 1 ? (
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={isNextDisabled || isLoading}
          loading={isLoading} // Ensure loading state is passed here too
        >
          {isEditing ? 'Finish & Save Integration' : 'Finish & Create Integration'}
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={onNext}
          disabled={isNextDisabled || isLoading}
          loading={isLoading} // And here
        >
          Next
        </Button>
      )}
    </InlineStack>
  )
}

export default WizardActions 