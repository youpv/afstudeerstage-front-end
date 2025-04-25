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

  const handleFinish = (updated) => {
    editIntegration(updated)
    navigate('/')
  }

  return <IntegrationWizard initialData={integration} onFinish={handleFinish} />
}

export default IntegrationEditor 