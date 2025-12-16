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

export default function AuthDebug() {
  const { token, expiresAt, isAuthenticated, isTokenExpired } = useAuth()
  
  // Decode token to get user info
  const tokenPayload = token ? decodeJWTPayload(token) : null
  const userId = tokenPayload?.sub || tokenPayload?.nameid || tokenPayload?.userId || tokenPayload?.id || null

  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '12px',
      margin: '10px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '600px',
      wordBreak: 'break-all'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>🔐 Auth Debug</div>
      
      <div style={{ marginBottom: '6px' }}>
        <strong>Authenticated:</strong> {isAuthenticated ? '✓ Yes' : '✗ No'}
      </div>
      
      {userId && (
        <div style={{ marginBottom: '6px' }}>
          <strong>User ID:</strong> {userId}
        </div>
      )}
      
      <div style={{ marginBottom: '6px' }}>
        <strong>Token Expired:</strong> {isTokenExpired ? '✓ Yes' : '✗ No'}
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <strong>Expires At:</strong> {expiresAt ? new Date(expiresAt).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen' }) : 'None'}
      </div>
      
      {tokenPayload && (
        <div style={{ marginBottom: '6px' }}>
          <strong>Token Payload:</strong>
          <div style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
            {Object.entries(tokenPayload).map(([key, value]) => (
              <div key={key}><strong>{key}:</strong> {String(value).substring(0, 50)}{String(value).length > 50 ? '...' : ''}</div>
            ))}
          </div>
        </div>
      )}
      
      {token && (
        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '2px' }}>
          <div style={{ marginBottom: '4px' }}>
            <strong>Token (first 50 chars):</strong>
          </div>
          <div style={{ color: '#666' }}>{token.substring(0, 50)}...</div>
        </div>
      )}
    </div>
  )
}
