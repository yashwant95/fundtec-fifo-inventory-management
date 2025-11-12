import { useEffect, useMemo, useState } from 'react'
import { removeToken } from '../utils/auth'
import api from '../utils/api'
import { formatDistanceToNow, format } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts'

// colors for pie chart
const PIE_COLORS = ['#10B981', '#F59E0B']

function Dashboard({ setIsAuthenticated }) {
  const [inventory, setInventory] = useState([])
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // UI state
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState({ key: 'productId', dir: 'asc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(9)
  const [onlyLowStock, setOnlyLowStock] = useState(false)

  // Ledger Pagination State
  const [ledgerPage, setLedgerPage] = useState(1)
  const ledgerPageSize = 10

  // Modal State
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showModal, setShowModal] = useState(false)
  
  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // fetch inventory and ledger data
  async function fetchData() {
    try {
      setLoading(true)
      const [inventoryRes, ledgerRes] = await Promise.all([
        api.get('/api/inventory/status'),
        api.get('/api/inventory/ledger')
      ])

      if (inventoryRes.data.success) {
        setInventory(inventoryRes.data.data || [])
      }
      
      if (ledgerRes.data.success) {
        const sorted = (ledgerRes.data.data || []).sort((a, b) => {
          return new Date(b.timestamp) - new Date(a.timestamp)
        })
        setLedger(sorted)
      }

      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  function handleLogout() {
    removeToken()
    setIsAuthenticated(false)
  }

  async function handleSimulateEvents() {
    setSimulating(true)
    setError('')
    setSuccessMessage('')
    
    try {
      const res = await api.post('/api/inventory/simulate-events')
      if (res.data.success) {
        const count = res.data.results.successful || 0
        setSuccessMessage(`Successfully simulated ${count} events!`)
        // wait a bit then refresh
        setTimeout(() => {
          fetchData()
        }, 1500)
        setTimeout(() => setSuccessMessage(''), 5000)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to simulate events')
      console.error('Simulation error:', err)
    } finally {
      setSimulating(false)
    }
  }

  async function handleClearAllData() {
    setShowConfirmModal(true)
  }

  async function confirmClearAllData() {
    setShowConfirmModal(false)
    setLoading(true)
    setError('')
    setSuccessMessage('')
    
    try {
      const res = await api.delete('/api/inventory/clear-all')
      if (res.data.success) {
        setSuccessMessage(`All data cleared successfully! Tables cleared: ${res.data.tablesCleared.join(', ')}`)
        setInventory([])
        setLedger([])
        setTimeout(() => setSuccessMessage(''), 5000)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clear data')
      console.error('Clear data error:', err)
    } finally {
      setLoading(false)
    }
  }

  // helper functions for formatting
  function formatCurrency(value) {
    if (!value) return '₹0.00'
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      minimumFractionDigits: 2 
    }).format(value)
  }
  
  function formatDate(dateString) {
    try {
      const date = new Date(dateString)
      return format(date, 'MMM dd, yyyy HH:mm:ss')
    } catch {
      return new Date(dateString).toLocaleString()
    }
  }

  function formatRelativeTime(dateString) {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return ''
    }
  }
  
  function formatNumber(value) {
    return new Intl.NumberFormat('en-IN').format(value || 0)
  }

  // calculate stats
  const stats = useMemo(() => {
    const totalProducts = inventory.length
    let totalValue = 0
    inventory.forEach(item => {
      totalValue += parseFloat(item.totalCost || 0)
    })
    
    const totalTransactions = ledger.length
    const lowStockProducts = inventory.filter(i => i.totalQuantity < 50).length
    const outOfStockProducts = inventory.filter(i => i.totalQuantity === 0).length
    const averageStockValue = totalProducts > 0 ? totalValue / totalProducts : 0
    
    return { 
      totalProducts, 
      totalValue, 
      totalTransactions, 
      lowStockProducts,
      outOfStockProducts,
      averageStockValue
    }
  }, [inventory, ledger])

  // filter and sort inventory
  const filtered = useMemo(() => {
    const searchQuery = query.trim().toLowerCase()
    let results = [...inventory]
    
    // filter by search query
    if (searchQuery) {
      results = results.filter(item => {
        const productId = (item.productId || '').toLowerCase()
        const name = (item.name || '').toLowerCase()
        return productId.includes(searchQuery) || name.includes(searchQuery)
      })
    }
    
    // filter low stock
    if (onlyLowStock) {
      results = results.filter(item => item.totalQuantity < 50)
    }

    // sort results
    results.sort((a, b) => {
      const key = sortBy.key
      const direction = sortBy.dir === 'asc' ? 1 : -1
      const valA = a[key] ?? ''
      const valB = b[key] ?? ''
      
      // handle numeric fields
      if (key === 'totalQuantity' || key === 'totalCost' || key === 'averageCost') {
        return (Number(valA) - Number(valB)) * direction
      }
      
      // string comparison
      return String(valA).localeCompare(String(valB)) * direction
    })
    
    return results
  }, [inventory, query, sortBy, onlyLowStock])

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  
  useEffect(() => {
    if (page > totalPages) {
      setPage(1)
    }
  }, [totalPages, page])
  
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Ledger Pagination
  const { ledgerPageData, totalLedgerPages } = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(ledger.length / ledgerPageSize))
    const data = ledger.slice((ledgerPage - 1) * ledgerPageSize, ledgerPage * ledgerPageSize)
    return { ledgerPageData: data, totalLedgerPages: totalPages }
  }, [ledger, ledgerPage, ledgerPageSize])

  useEffect(() => {
    if (ledgerPage > totalLedgerPages) setLedgerPage(1)
  }, [ledgerPage, totalLedgerPages])

  // export to CSV
  function exportCSV(rows, filename = 'inventory.csv') {
    if (!rows || rows.length === 0) return
    
    const headers = Object.keys(rows[0])
    const csvRows = [headers.join(',')]
    
    rows.forEach(row => {
      const values = headers.map(h => {
        const val = (row[h] ?? '').toString().replace(/"/g, '""')
        return `"${val}"`
      })
      csvRows.push(values.join(','))
    })
    
    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    
    URL.revokeObjectURL(url)
  }

  // build chart data for inventory value over time
  const valueSeries = useMemo(() => {
    const dateMap = {}
    
    // go through ledger backwards to build up the changes
    const reversed = [...ledger].reverse()
    reversed.forEach(transaction => {
      const date = new Date(transaction.timestamp).toISOString().slice(0, 10)
      if (!dateMap[date]) {
        dateMap[date] = 0
      }
      
      if (transaction.event_type === 'purchase') {
        dateMap[date] += (transaction.unit_price * transaction.quantity)
      } else {
        dateMap[date] -= (transaction.total_cost || 0)
      }
    })
    
    // get last 30 days
    const dates = Object.keys(dateMap).sort().slice(-30)
    let currentValue = stats.totalValue
    const chartData = dates.map(date => {
      const value = currentValue
      currentValue -= dateMap[date]
      return { date, value }
    }).reverse()

    return chartData
  }, [ledger, stats.totalValue])

  // pie chart data for stock status
  const pieData = useMemo(() => {
    const lowStock = stats.lowStockProducts
    const outOfStock = stats.outOfStockProducts
    const healthyStock = stats.totalProducts - lowStock - outOfStock
    
    return [
      { name: 'Healthy Stock', value: healthyStock },
      { name: 'Low Stock', value: lowStock },
      { name: 'Out of Stock', value: outOfStock }
    ]
  }, [stats.lowStockProducts, stats.outOfStockProducts, stats.totalProducts])

  function openTransaction(tx) {
    setSelectedTransaction(tx)
    setShowModal(true)
  }

  if (loading && !inventory.length) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Fundtec 
            </h1>
          </div>
          <div className="text-sm text-gray-500">Real-time FIFO Inventory</div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="text-gray-600">Loading your inventory data…</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Fundtec  Assignment
              </h1>
              <p className="text-xs text-gray-500">Real-time FIFO Inventory Management</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                Syncing...
              </div>
            )}
            
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input 
                  type="checkbox" 
                  checked={autoRefresh} 
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="sr-only"
                />
                Auto-refresh
              </label>
            </div>

            <button 
              onClick={handleSimulateEvents} 
              disabled={simulating}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60 hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              {simulating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Simulating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Simulate Events
                </>
              )}
            </button>

            <button 
              onClick={handleClearAllData}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-60 hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All Data
            </button>

            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>

            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Enhanced Alert Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {successMessage}
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(stats.totalProducts)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(stats.totalTransactions)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(stats.lowStockProducts)}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.outOfStockProducts} out of stock</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Product Inventory</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage and monitor your product stock levels</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => exportCSV(filtered.map(i => ({ productId: i.productId, name: i.name, quantity: i.totalQuantity, totalCost: i.totalCost, avgCost: i.averageCost })))}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Enhanced Filter Bar */}
                <div className="mt-6 flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input 
                        value={query} 
                        onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                        placeholder="Search products..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <select
                    value={`${sortBy.key}-${sortBy.dir}`}
                    onChange={(e) => {
                      const [key, dir] = e.target.value.split('-');
                      setSortBy({ key, dir });
                    }}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    <option value="productId-asc">Sort by ID (A-Z)</option>
                    <option value="productId-desc">Sort by ID (Z-A)</option>
                    <option value="totalQuantity-asc">Sort by Qty (Low-High)</option>
                    <option value="totalQuantity-desc">Sort by Qty (High-Low)</option>
                    <option value="totalCost-desc">Sort by Value (High-Low)</option>
                    <option value="totalCost-asc">Sort by Value (Low-High)</option>
                  </select>

                  <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={onlyLowStock} 
                      onChange={(e) => { setOnlyLowStock(e.target.checked); setPage(1); }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Low Stock Only (&lt;50)
                  </label>

                  <select 
                    value={pageSize} 
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} 
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    <option value={6}>6 per page</option>
                    <option value={9}>9 per page</option>
                    <option value={12}>12 per page</option>
                  </select>
                </div>
              </div>

              {/* Product Cards Grid */}
              <div className="p-6">
                {pageData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
                    <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
                    <button 
                      onClick={handleSimulateEvents}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Simulate Inventory Events
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pageData.map(item => (
                      <div 
                        key={item.productId} 
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group"
                        onClick={() => openTransaction({ type: 'product', item })}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate" title={item.productId}>
                              {item.productId}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">{item.name || 'Unnamed Product'}</p>
                            <p className="text-xs text-gray-500 mt-1">Avg: {formatCurrency(item.averageCost)}</p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.totalQuantity === 0 
                              ? 'bg-red-100 text-red-800' 
                              : item.totalQuantity < 50 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {item.totalQuantity === 0 ? 'Out of Stock' : item.totalQuantity < 50 ? 'Low Stock' : 'In Stock'}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div className="text-2xl font-bold text-gray-900">{formatNumber(item.totalQuantity)}</div>
                          <div className="text-sm text-gray-500">units</div>
                        </div>

                        <div className="border-t border-gray-100 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Value</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(item.totalCost)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Enhanced Pagination */}
                {pageData.length > 0 && (
                  <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100 pt-6">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
                      <span className="font-medium">{formatNumber(filtered.length)}</span> products
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        disabled={page === 1}
                        className="px-3 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">Page</span>
                        <input 
                          value={page} 
                          onChange={(e) => setPage(Math.max(1, Math.min(totalPages, Number(e.target.value || 1))))}
                          className="w-12 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-sm text-gray-600">of {totalPages}</span>
                      </div>
                      
                      <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        disabled={page === totalPages}
                        className="px-3 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Sidebar */}
          <div className="space-y-6">
            {/* Stock Status Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Status Overview</h3>
              {stats.totalProducts === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No stock data available</p>
                </div>
              ) : (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, value }) => `${value}`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? '#10B981' : index === 1 ? '#F59E0B' : '#EF4444'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} products`, 'Count']} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span style={{ fontSize: '12px', color: '#374151' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Value Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Value Trend</h3>
              {valueSeries.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No trend data available</p>
                </div>
              ) : (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer>
                    <LineChart data={valueSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="date" 
                        fontSize={10}
                        tick={{ fill: '#6b7280' }}
                        tickLine={false}
                      />
                      <YAxis 
                        fontSize={10}
                        tick={{ fill: '#6b7280' }}
                        tickLine={false}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                      />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'Inventory Value']}
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#0ea5e9" 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 4, stroke: '#0ea5e9', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Ledger Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Transaction Ledger</h2>
                <p className="text-sm text-gray-600 mt-1">Complete history of inventory movements</p>
              </div>
              <div className="text-sm text-gray-500">
                {ledger.length} total transactions
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerPageData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-gray-500">No transactions recorded yet</p>
                      <p className="text-sm text-gray-400 mt-1">Simulate events to see transaction history</p>
                    </td>
                  </tr>
                ) : ledgerPageData.map(tx => (
                  <tr 
                    key={`${tx.event_type}-${tx.id}`} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                    onClick={() => openTransaction(tx)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(tx.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tx.product_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.event_type === 'purchase' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tx.event_type === 'purchase' ? 'Purchase' : 'Sale'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatNumber(tx.quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {tx.event_type === 'purchase' ? formatCurrency(tx.unit_price) : formatCurrency(tx.unit_cost || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(tx.event_type === 'purchase' ? (tx.unit_price * tx.quantity) : tx.total_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.event_type === 'sale' && tx.batch_details?.length ? (
                        <div className="flex items-center gap-1">
                          <span>{tx.batch_details.length} batches</span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ledger Pagination */}
          {ledgerPageData.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-medium">{(ledgerPage - 1) * ledgerPageSize + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(ledgerPage * ledgerPageSize, ledger.length)}</span> of{' '}
                  <span className="font-medium">{formatNumber(ledger.length)}</span> transactions
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setLedgerPage(p => Math.max(1, p - 1))} 
                    disabled={ledgerPage === 1}
                    className="px-3 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    Page <span className="font-medium">{ledgerPage}</span> of <span className="font-medium">{totalLedgerPages}</span>
                  </div>
                  
                  <button 
                    onClick={() => setLedgerPage(p => Math.min(totalLedgerPages, p + 1))} 
                    disabled={ledgerPage === totalLedgerPages}
                    className="px-3 py-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Enhanced Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedTransaction?.type === 'product' 
                  ? `Product Details - ${selectedTransaction.item.productId}`
                  : `Transaction Details`
                }
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedTransaction?.type === 'product' ? (
                <div className="space-y-6">
                  {/* Product Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Product Name</div>
                      <div className="font-semibold text-gray-900 mt-1">{selectedTransaction.item.name || 'N/A'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Total Quantity</div>
                      <div className="font-semibold text-gray-900 mt-1">{formatNumber(selectedTransaction.item.totalQuantity)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Total Value</div>
                      <div className="font-semibold text-gray-900 mt-1">{formatCurrency(selectedTransaction.item.totalCost)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Average Cost</div>
                      <div className="font-semibold text-gray-900 mt-1">{formatCurrency(selectedTransaction.item.averageCost)}</div>
                    </div>
                  </div>

                  {/* Batches Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">FIFO Batches</h4>
                    {selectedTransaction.item.batches?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedTransaction.item.batches.map((b, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200">
                            <div className="flex justify-between items-start mb-3">
                              <span className="font-semibold text-gray-900">Batch #{b.batch_id}</span>
                              <span className="text-sm text-gray-500">{formatDate(b.timestamp)}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Quantity</span>
                                <span className="font-medium text-gray-900">{formatNumber(b.quantity)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Unit Price</span>
                                <span className="font-medium text-gray-900">{formatCurrency(b.unit_price)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Batch Value</span>
                                <span className="font-medium text-gray-900">{formatCurrency(b.quantity * b.unit_price)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-gray-500">No batches available (Out of stock)</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Transaction Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Product ID</div>
                      <div className="font-semibold text-gray-900 mt-1">{selectedTransaction.product_id}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Event Type</div>
                      <div className="font-semibold text-gray-900 mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedTransaction.event_type === 'purchase' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedTransaction.event_type}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Quantity</div>
                      <div className="font-semibold text-gray-900 mt-1">{formatNumber(selectedTransaction.quantity)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Total Cost</div>
                      <div className="font-semibold text-gray-900 mt-1">{formatCurrency(selectedTransaction.total_cost)}</div>
                    </div>
                  </div>

                  {/* FIFO Breakdown */}
                  {selectedTransaction.batch_details?.length ? (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">FIFO Cost Breakdown</h4>
                      <div className="grid gap-3">
                        {selectedTransaction.batch_details.map((bd, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200">
                            <div className="flex justify-between items-start mb-3">
                              <span className="font-semibold text-gray-900">Batch #{bd.batch_id}</span>
                              <span className="text-sm text-gray-500">{bd.quantity_used} units used</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Unit Cost</span>
                                <span className="font-medium text-gray-900">{formatCurrency(bd.unit_cost)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Batch Contribution</span>
                                <span className="font-medium text-gray-900">{formatCurrency(bd.quantity_used * bd.unit_cost)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-gray-500">No batch breakdown available (Purchase event)</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fadeIn">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Clear All Data?
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                This will permanently delete <span className="font-semibold text-red-600">all products, inventory batches, and sales records</span> from the database. This action cannot be undone!
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-1">Warning:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>All products will be deleted</li>
                      <li>All inventory batches will be removed</li>
                      <li>All sales records will be erased</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={confirmClearAllData}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard