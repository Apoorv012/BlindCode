import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

// API: POST /auth/login
// Body: { username: string, password: string }
// Returns: { token: string, admin: { id, name } }
// For now: mock login with hardcoded credentials

const MOCK_CREDENTIALS = { username: 'admin', password: 'blindcode123' }

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!username || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    // Simulate API call delay
    await new Promise(r => setTimeout(r, 800))

    // TODO: Replace with real API call
    // const res = await fetch('/api/auth/login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ username, password })
    // })
    // const data = await res.json()
    // if (!res.ok) { setError(data.message); setLoading(false); return; }
    // localStorage.setItem('bc_admin_token', data.token)

    if (username === MOCK_CREDENTIALS.username && password === MOCK_CREDENTIALS.password) {
      localStorage.setItem('bc_admin_token', 'mock_token_123')
      navigate('/')
    } else {
      setError('Invalid username or password')
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="login-page">
      {/* Background grid */}
      <div className="login-bg">
        <div className="grid-overlay" />
      </div>

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-mark">BC</div>
          <div className="login-logo-text">
            <div className="login-title">BlindCode</div>
            <div className="login-subtitle">Admin Console</div>
          </div>
        </div>

        {/* Card */}
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">Sign in</h2>
            <p className="login-card-sub">Access the admin dashboard</p>
          </div>

          <div className="login-form">
            <div className="login-field">
              <label className="login-label">Username</label>
              <input
                className={`login-input ${error ? 'input-error' : ''}`}
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>

            <div className="login-field">
              <label className="login-label">Password</label>
              <div className="input-wrap">
                <input
                  className={`login-input ${error ? 'input-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="show-password"
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                >
                  {showPassword ? '!👁' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <span>⚠</span> {error}
              </div>
            )}

            <button
              className={`login-btn ${loading ? 'login-btn-loading' : ''}`}
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                'Sign in →'
              )}
            </button>
          </div>

          <div className="login-hint">
            <span className="hint-label">Demo credentials</span>
            <code className="hint-code">admin / blindcode123</code>
          </div>
        </div>

        <div className="login-footer">
          BlindCode Arena · Admin Only
        </div>
      </div>
    </div>
  )
}
