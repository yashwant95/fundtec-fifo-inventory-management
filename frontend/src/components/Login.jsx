import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { setToken } from '../utils/auth'

function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/api/auth/login', {
        username,
        password
      })

      if (res.data.success) {
        setToken(res.data.token)
        setIsAuthenticated(true)
        navigate('/')
      } else {
        setError(res.data.message || 'Login failed')
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md mx-4">
        <h1 className="text-center text-gray-800 mb-2 text-3xl font-bold">
          Inventory Management System
        </h1>
        <h2 className="text-center text-gray-600 mb-8 text-base font-normal">
          FIFO Costing Method
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="username" className="block mb-2 text-gray-700 font-medium">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter username"
              className="w-full px-3 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block mb-2 text-gray-700 font-medium">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              className="w-full px-3 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-md text-base font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600 bg-gray-50 p-4 rounded-md">
          <p className="mb-1">Default credentials:</p>
          <p className="mb-1">
            Username: <strong className="text-gray-800">admin</strong>
          </p>
          <p>
            Password: <strong className="text-gray-800">admin123</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login


