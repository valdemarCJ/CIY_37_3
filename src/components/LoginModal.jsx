import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import ApiService from '../services/ApiService'

export default function LoginModal({ show, onClose, onLogin }) {
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [loginData, setLoginData] = useState({
    username: 'testtestuser',
    password: 'testtest'
  })
  const [signupData, setSignupData] = useState({
    email: '',
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const result = await login(loginData.username, loginData.password)
      
      if (!result.success) {
        // Show specific error message
        setError(result.error || 'Login failed. Please check your credentials.')
        setLoading(false)
        return
      }

      // Update ApiService with new token
      ApiService.setToken(result.token)
      
      onLogin(loginData.username)
      onClose()
      
      // Reset form
      setLoginData({ username: '', password: '' })
      setLoading(false)
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await ApiService.register(signupData)
      // After successful registration, try to login
      const result = await login(signupData.username, signupData.password)
      
      if (!result.success) {
        setError('Registration successful, but login failed. Please try logging in.')
        setLoading(false)
        return
      }

      // Update ApiService with new token
      ApiService.setToken(result.token)
      
      onLogin(signupData.username)
      onClose()
      
      // Reset form
      setSignupData({ email: '', username: '', password: '' })
      setLoading(false)
    } catch (err) {
      console.error('Signup error:', err)
      setError('Signup failed. Please try again.')
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Login/ signup pop up</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            
            {isLogin ? (
              /* Login Form */
              <form onSubmit={handleLoginSubmit}>
                <div className="mb-3">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Username/email"
                    value={loginData.username}
                    onChange={(e) => setLoginData(prev => ({...prev, username: e.target.value}))}
                    required
                    disabled={loading}
                    style={{ border: '2px solid #000' }}
                  />
                </div>
                <div className="mb-4">
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Password"
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({...prev, password: e.target.value}))}
                    required
                    disabled={loading}
                    style={{ border: '2px solid #000' }}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
                
                <div className="text-center">
                  <p className="mb-2">not a user?</p>
                  <button 
                    type="button" 
                    className="btn btn-link text-decoration-none p-0"
                    onClick={() => {
                      setIsLogin(false)
                      setError('')
                    }}
                    disabled={loading}
                  >
                    Signup:
                  </button>
                </div>
              </form>
            ) : (
              /* Signup Form */
              <form onSubmit={handleSignupSubmit}>
                <p className="mb-3">not a user?<br/>Signup:</p>
                <div className="mb-3">
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="E-mail"
                    value={signupData.email}
                    onChange={(e) => setSignupData(prev => ({...prev, email: e.target.value}))}
                    required
                    disabled={loading}
                    style={{ border: '1px solid #000' }}
                  />
                </div>
                <div className="mb-3">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Username"
                    value={signupData.username}
                    onChange={(e) => setSignupData(prev => ({...prev, username: e.target.value}))}
                    required
                    disabled={loading}
                    style={{ border: '1px solid #000' }}
                  />
                </div>
                <div className="mb-4">
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Password"
                    value={signupData.password}
                    onChange={(e) => setSignupData(prev => ({...prev, password: e.target.value}))}
                    required
                    disabled={loading}
                    style={{ border: '1px solid #000' }}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-success w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
                
                <div className="text-center">
                  <button 
                    type="button" 
                    className="btn btn-link text-decoration-none"
                    onClick={() => {
                      setIsLogin(true)
                      setError('')
                    }}
                    disabled={loading}
                  >
                    Already have an account? Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}