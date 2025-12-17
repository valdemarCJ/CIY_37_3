import { useAuth } from '../context/AuthContext'

// Function to decode JWT token payload
const decodeJWTPayload = (token) => {
  try {
    if (!token) return null
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error decoding JWT:', error)
    return null
  }
}

export default function AuthDebugFooter() {
  const { token, expiresAt, isAuthenticated, isTokenExpired } = useAuth()
  
  // Decode token to get user info
  const tokenPayload = token ? decodeJWTPayload(token) : null
  const userId = tokenPayload?.sub || tokenPayload?.nameid || tokenPayload?.userId || tokenPayload?.id || null

  return (
    <footer style={{
      backgroundColor: '#2c3e50',
      color: '#ecf0f1',
      padding: '15px',
      fontSize: '11px',
      fontFamily: 'monospace',
      borderTop: '3px solid #3498db',
      marginTop: 'auto'
    }}>
      <div className="container-fluid">
        <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#3498db' }}>🔐 Auth Debug</div>
        
        <div className="row">
          <div className="col-md-6">
            <div style={{ marginBottom: '4px' }}>
              <strong>Authenticated:</strong> {isAuthenticated ? '✓ Yes' : '✗ No'}
            </div>
            
            {userId && (
              <div style={{ marginBottom: '4px' }}>
                <strong>User ID:</strong> {userId}
              </div>
            )}
            
            <div style={{ marginBottom: '4px' }}>
              <strong>Token Expired:</strong> {isTokenExpired ? '✓ Yes' : '✗ No'}
            </div>
            
            <div style={{ marginBottom: '4px' }}>
              <strong>Expires At:</strong> {expiresAt ? new Date(expiresAt).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen' }) : 'None'}
            </div>
          </div>
          
          <div className="col-md-6">
            {tokenPayload && (
              <div style={{ marginBottom: '6px' }}>
                <strong>Token Payload:</strong>
                <div style={{ fontSize: '10px', color: '#bdc3c7', marginLeft: '8px' }}>
                  {Object.entries(tokenPayload).map(([key, value]) => (
                    <div key={key}><strong>{key}:</strong> {String(value)}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {token && (
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#34495e', border: '1px solid #4a6741', borderRadius: '4px' }}>
            <div style={{ marginBottom: '4px', color: '#3498db' }}>
              <strong>Full Bearer Token:</strong>
            </div>
            <div style={{ 
              color: '#95a5a6', 
              fontSize: '9px', 
              wordBreak: 'break-all',
              fontFamily: 'Consolas, Monaco, monospace'
            }}>
              {token}
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}