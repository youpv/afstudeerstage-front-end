/**
 * Renders the progress indicator badges for the wizard steps.
 * @param {{ steps: string[], currentStep: number }} props
 */
function WizardStepsIndicator({ steps, currentStep }) {
  return (
    <div>
      {steps.map((label, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        let statusText = '';
        if (isCurrent) {
          statusText = ' (Current)';
        } else if (isCompleted) {
          statusText = ' (Completed)';
        }

        return (
          <span key={label}>
            {label}{statusText}
          </span>
        );
      })}
    </div>
  );
}

export default WizardStepsIndicator; 