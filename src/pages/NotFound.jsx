import { useNavigate } from 'react-router-dom'

function NotFound() {
  const navigate = useNavigate()

  return (
    <div>
      <h1>Page not found</h1>
      <div>
        <div>
          <div>
            <h2>We couldn't find that page</h2>
            <button onClick={() => navigate('/')}>Back to dashboard</button>
            <img src="https://cdn.shopify.com/s/files/1/1906/1335/files/empty-state.svg" alt="" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound 