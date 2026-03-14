import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'
import { apiLogin } from '../api'

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
    try {
      const data = await apiLogin(username, password)
      localStorage.setItem('bc_admin_token', data.token)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
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
            <span className="hint-label">Register an account first via API or seed script</span>
          </div>
        </div>

        <div className="login-footer">
          BlindCode Arena · Admin Only
        </div>
      </div>
    </div>
  )
}