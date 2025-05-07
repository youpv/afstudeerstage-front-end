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
  const options = [
    { label: 'Every Hour', value: '1' },
    { label: 'Every 12 Hours', value: '12' },
    { label: 'Daily (Every 24 Hours)', value: '24' },
  ];

  return (
    <div>
      <div style={{ padding: 'var(--p-space-400)' }}>
        <div>
          <h2>{stepTitle}</h2>
          <div>
            <label htmlFor={frequencyId}>Sync Frequency</label>
            <select
              id={frequencyId}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p><small>How often should the integration check for updates?</small></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WizardStepSchedule 