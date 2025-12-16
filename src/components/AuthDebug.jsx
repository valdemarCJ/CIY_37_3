import { useAuth } from '../context/AuthContext'

export default function AuthDebug() {
  const { token, expiresAt, isAuthenticated, isTokenExpired } = useAuth()

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
      
      <div style={{ marginBottom: '6px' }}>
        <strong>Token Expired:</strong> {isTokenExpired ? '✓ Yes' : '✗ No'}
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <strong>Expires At:</strong> {expiresAt ? new Date(expiresAt).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen' }) : 'None'}
      </div>
      
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
