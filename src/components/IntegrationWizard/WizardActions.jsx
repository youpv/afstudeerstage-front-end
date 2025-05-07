/**
 * Renders the Back/Next/Finish action buttons for the wizard.
 * @param {{
 *   onBack: () => void,
 *   onNext: () => void,
 *   onSubmit: () => void,
 *   currentStep: number,
 *   totalSteps: number,
 *   isNextDisabled: boolean,
 *   isLoading: boolean,
 *   isEditing: boolean
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
  isEditing
}) {
  return (
    <div>
      <button onClick={onBack} disabled={currentStep === 0 || isLoading}>
        Back
      </button>
      {currentStep === totalSteps - 1 ? (
        <button
          onClick={onSubmit}
          disabled={isNextDisabled || isLoading}
        >
          {isLoading ? 'Loading...' : (isEditing ? 'Finish & Save Integration' : 'Finish & Create Integration')}
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={isNextDisabled || isLoading}
        >
          {isLoading ? 'Loading...' : 'Next'}
        </button>
      )}
    </div>
  )
}

export default WizardActions 