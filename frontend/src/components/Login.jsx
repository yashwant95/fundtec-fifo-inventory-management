import React, { useState } from 'react'
// import { useNavigate } from 'react-router-dom' // Mocked
// import api from '../utils/api' // Mocked
// import { setToken } from '../utils/auth' // Mocked

// --- MOCK DEPENDENCIES ---

// Mock react-router-dom's useNavigate
const useNavigate = () => {
  return (path) => console.log(`Mock navigate to: ${path}`);
};

// Mock setToken
const setToken = (token) => {
  console.log(`Mock: Token set (${token})`);
};

// Mock API
const api = {
  post: (url, { username, password }) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (url === '/api/auth/login' && username === 'admin' && password === 'admin123') {
          resolve({ 
            data: { 
              success: true, 
              token: 'mock-jwt-token-xyz-123' 
            } 
          });
        } else if (url === '/api/auth/login') {
          reject({ 
            response: { 
              data: { 
                message: 'Invalid username or password.' 
              } 
            } 
          });
        } else {
          reject({ 
            response: { 
              data: { 
                message: 'Mock API endpoint not found.' 
              } 
            } 
          });
        }
      }, 1000); // Simulate network delay
    });
  }
};

// --- END MOCK ---


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
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md mx-auto">
        
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Fundtec Assignment
          </h1>
          <h2 className="text-center text-gray-500 mt-2 text-base font-normal">
            FIFO Inventory Management
          </h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Username Input */}
          <div className="mb-6">
            <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-700">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="e.g., admin"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          
          {/* Password Input */}
          <div className="mb-6">
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="e.g., admin123"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-base font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
        
        {/* Credentials Hint */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
          <p className="mb-2">For demo purposes, use:</p>
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