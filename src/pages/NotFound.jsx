import { Page, Layout, EmptyState, Button } from '@shopify/polaris'
import { useNavigate } from 'react-router-dom'

function NotFound() {
  const navigate = useNavigate()

  return (
    <Page title="Page not found">
      <Layout>
        <Layout.Section>
          <EmptyState
            heading="We couldn't find that page"
            action={{ content: 'Back to dashboard', onAction: () => navigate('/') }}
            image="https://cdn.shopify.com/s/files/1/1906/1335/files/empty-state.svg"
          />
        </Layout.Section>
      </Layout>
    </Page>
  )
}

export default NotFound 