import IntegrationWizard from './IntegrationWizard.jsx'
import { useParams, useNavigate } from 'react-router-dom'
import { useIntegrations } from '../context/IntegrationContext.jsx'
import NotFound from './NotFound.jsx'

function IntegrationEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { integrations, editIntegration } = useIntegrations()

  const integration = integrations.find((item) => item.id === id)

  if (!integration) {
    return <NotFound />
  }

  const handleFinish = async (updated) => {
    try {
      await editIntegration(updated)
      navigate('/')
    } catch (error) {
      console.error('Error updating integration:', error)
      // Still navigate away even if there's an error
      navigate('/')
    }
  }

  return <IntegrationWizard initialData={integration} onFinish={handleFinish} />
}

export default IntegrationEditor 