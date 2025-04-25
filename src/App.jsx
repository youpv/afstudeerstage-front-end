import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import IntegrationWizard from './pages/IntegrationWizard.jsx'
import IntegrationEditor from './pages/IntegrationEditor.jsx'
import IntegrationDetail from './pages/IntegrationDetail.jsx'
import { useIntegrations } from './context/IntegrationContext.jsx'
import ScrollToTop from './utils/ScrollToTop.jsx'
import NotFound from './pages/NotFound.jsx'

function App() {
  const navigate = useNavigate()
  const { addIntegration, integrations, deleteIntegration } = useIntegrations()

  const handleWizardFinish = (integration) => {
    addIntegration(integration)
    navigate('/') // go back to dashboard
  }

  const handleCreate = () => navigate('/integrations/new')
  const handleDelete = (id) => deleteIntegration(id)
  const handleEdit = (id) => navigate(`/integrations/${id}/edit`)

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              integrations={integrations}
              onCreate={handleCreate}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          }
        />
        <Route path="/integrations/new" element={<IntegrationWizard onFinish={handleWizardFinish} />} />
        <Route path="/integrations/:id/edit" element={<IntegrationEditor />} />
        <Route path="/integrations/:id" element={<IntegrationDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
