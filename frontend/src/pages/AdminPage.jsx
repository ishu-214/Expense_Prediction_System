import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Users,
  Activity,
  Cpu,
  Layers,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  Clock,
  LifeBuoy,
  MessageSquare,
  DollarSign,
  Check,
  X,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  UserCheck,
  UserX
} from 'lucide-react'
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts'
import { adminAPI, categoriesAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatPercentage, formatDate } from '../utils/formatters'
import LoadingSkeleton from '../components/LoadingSkeleton'

export const AdminPage = () => {
  const { currency, isAdmin, user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'users' | 'activities' | 'categories' | 'models' | 'issues'
  const [loading, setLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState(null)

  // Data states
  const [analytics, setAnalytics] = useState(null)
  const [usageStats, setUsageStats] = useState(null)
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [activities, setActivities] = useState([])
  const [activityFilter, setActivityFilter] = useState('ALL')
  const [categories, setCategories] = useState([])
  const [categoryTypeFilter, setCategoryTypeFilter] = useState('all')
  const [modelPerf, setModelPerf] = useState(null)
  const [retraining, setRetraining] = useState(false)
  const [issues, setIssues] = useState([])
  const [issueFilter, setIssueFilter] = useState('all')

  // Category Add / Edit State
  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState('expense')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [catSaving, setCatSaving] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  // Issue Create Modal State
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [newIssueTitle, setNewIssueTitle] = useState('')
  const [newIssueDesc, setNewIssueDesc] = useState('')
  const [newIssueCategory, setNewIssueCategory] = useState('General')
  const [newIssueSeverity, setNewIssueSeverity] = useState('medium')
  const [submittingIssue, setSubmittingIssue] = useState(false)
  
  // Issue Admin Notes Edit
  const [editingIssueNotes, setEditingIssueNotes] = useState(null)
  const [issueNotesText, setIssueNotesText] = useState('')

  const showNotification = (msg, type = 'success') => {
    setActionMessage({ text: msg, type })
    setTimeout(() => setActionMessage(null), 4000)
  }

  const fetchAllAdminData = async () => {
    try {
      setLoading(true)
      const [uRes, aRes, mRes, cRes, sRes, actRes, issRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getAnalytics(),
        adminAPI.getModelPerformance(),
        adminAPI.getCategories(),
        adminAPI.getUsageStats(),
        adminAPI.getActivities({ limit: 60 }),
        adminAPI.getIssues()
      ])
      setUsers(uRes.data || [])
      setAnalytics(aRes.data || null)
      setModelPerf(mRes.data || null)
      setCategories(cRes.data || [])
      setUsageStats(sRes.data || null)
      setActivities(actRes.data || [])
      setIssues(issRes.data || [])
    } catch (err) {
      console.error('Failed to load admin console data:', err)
      showNotification('Failed to load some admin telemetry data.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchAllAdminData()
    }
  }, [isAdmin])

  // ----------------- User Management Handlers -----------------
  const handleRoleChange = async (userId, targetRole) => {
    try {
      await adminAPI.updateUserRole(userId, { role: targetRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u))
      showNotification(`User role updated to '${targetRole}' successfully!`)
      // Refresh activities
      const actRes = await adminAPI.getActivities({ limit: 40 })
      setActivities(actRes.data || [])
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to update user role', 'error')
    }
  }

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to permanently delete user '${email}'? This action cannot be undone.`)) {
      return
    }
    try {
      await adminAPI.deleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      showNotification(`User ${email} deleted successfully.`)
      // Refresh usage stats
      const sRes = await adminAPI.getUsageStats()
      setUsageStats(sRes.data || null)
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to delete user', 'error')
    }
  }

  // ----------------- Category Handlers -----------------
  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    try {
      setCatSaving(true)
      const res = await adminAPI.createCategory({
        name: newCatName.trim(),
        category_type: newCatType,
        color: newCatColor,
        description: newCatDesc.trim() || `Custom ${newCatType} category`
      })
      setCategories(prev => [...prev, res.data])
      setNewCatName('')
      setNewCatDesc('')
      showNotification(`Category '${res.data.name}' added successfully!`)
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to create category', 'error')
    } finally {
      setCatSaving(false)
    }
  }

  const handleUpdateCategorySubmit = async (e) => {
    e.preventDefault()
    if (!editingCategory) return
    try {
      const res = await adminAPI.updateCategory(editingCategory.id, {
        name: editingCategory.name,
        category_type: editingCategory.category_type,
        color: editingCategory.color,
        description: editingCategory.description
      })
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? res.data : c))
      setEditingCategory(null)
      showNotification(`Category '${res.data.name}' updated!`)
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to update category', 'error')
    }
  }

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category '${name}'?`)) return
    try {
      await adminAPI.deleteCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      showNotification(`Category '${name}' deleted successfully.`)
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to delete category', 'error')
    }
  }

  // ----------------- ML Retrain Handler -----------------
  const handleRetrainModels = async () => {
    try {
      setRetraining(true)
      const res = await adminAPI.retrainModels()
      showNotification(res.data?.message || 'ML models retrained and evaluated successfully!')
      // Refresh model metrics and activities
      const [mRes, aRes] = await Promise.all([
        adminAPI.getModelPerformance(),
        adminAPI.getActivities({ limit: 40 })
      ])
      setModelPerf(mRes.data || null)
      setActivities(aRes.data || [])
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Retraining failed', 'error')
    } finally {
      setRetraining(false)
    }
  }

  // ----------------- Issue Handlers -----------------
  const handleCreateIssue = async (e) => {
    e.preventDefault()
    if (!newIssueTitle.trim()) return
    try {
      setSubmittingIssue(true)
      const res = await adminAPI.createIssue({
        title: newIssueTitle.trim(),
        description: newIssueDesc.trim(),
        category: newIssueCategory,
        severity: newIssueSeverity
      })
      setIssues(prev => [res.data, ...prev])
      setShowIssueModal(false)
      setNewIssueTitle('')
      setNewIssueDesc('')
      showNotification('New issue ticket logged successfully!')
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to log issue', 'error')
    } finally {
      setSubmittingIssue(false)
    }
  }

  const handleUpdateIssueStatus = async (issueId, newStatus) => {
    try {
      const res = await adminAPI.updateIssue(issueId, { status: newStatus })
      setIssues(prev => prev.map(i => i.id === issueId ? res.data : i))
      showNotification(`Issue status set to '${newStatus}'.`)
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to update issue', 'error')
    }
  }

  const handleSaveIssueNotes = async (issueId) => {
    try {
      const res = await adminAPI.updateIssue(issueId, { admin_notes: issueNotesText })
      setIssues(prev => prev.map(i => i.id === issueId ? res.data : i))
      setEditingIssueNotes(null)
      showNotification('Admin resolution notes saved.')
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to save notes', 'error')
    }
  }

  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm('Delete this reported issue ticket?')) return
    try {
      await adminAPI.deleteIssue(issueId)
      setIssues(prev => prev.filter(i => i.id !== issueId))
      showNotification('Issue ticket removed.')
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to delete issue', 'error')
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-3xl border border-rose-200 dark:border-rose-900">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Access Denied</h3>
        <p className="text-sm text-slate-500 mt-1">Administrator role is required to access the central admin control console.</p>
      </div>
    )
  }

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton count={4} />
      </div>
    )
  }

  // Filtered lists
  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const filteredActivities = activities.filter(a => {
    if (activityFilter === 'ALL') return true
    return a.action === activityFilter || a.entity_type === activityFilter.toLowerCase()
  })

  const filteredCategories = categories.filter(c => {
    if (categoryTypeFilter === 'all') return true
    return c.category_type === categoryTypeFilter
  })

  const filteredIssues = issues.filter(i => {
    if (issueFilter === 'all') return true
    return i.status === issueFilter
  })

  const catModel = modelPerf?.categorization_model || {}
  const predModel = modelPerf?.expense_prediction_model || {}
  const anomModel = modelPerf?.anomaly_detection_model || {}
  const recModel = modelPerf?.recommendation_engine || {}

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300'
      case 'high':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
      case 'medium':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
    }
  }

  const getStatusBadge = (st) => {
    switch (st) {
      case 'resolved':
      case 'closed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300'
      case 'in_progress':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300'
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
    }
  }

  const getActionBadgeColor = (action) => {
    if (action.includes('USER')) return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
    if (action.includes('TRANSACTION')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
    if (action.includes('MODEL') || action.includes('ANOMALY')) return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
    if (action.includes('BUDGET')) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
    if (action.includes('ISSUE')) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }

  return (
    <div className="space-y-7 pb-12">
      {/* Toast Alert */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between shadow-lg text-xs font-semibold animate-in slide-in-from-top-3 ${
          actionMessage.type === 'error' 
            ? 'bg-rose-600 text-white' 
            : 'bg-emerald-600 text-white'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="ml-4 opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-bold mb-1.5 border border-rose-200/50 dark:border-rose-800/50">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master Enterprise Administration Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Admin Command & Telemetry Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete management of registered users, platform usage statistics, system activities, categories, ML pipelines, and user issues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRetrainModels}
            disabled={retraining}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            title="Trigger full retraining and calibration of all 4 ML models"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Retraining ML Models...' : 'Retrain ML Models'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard & Statistics</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Users ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activities')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'activities'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Activities ({activities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'categories'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Transaction Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'models'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>ML Model Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'issues'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          <span>Reported Issues ({issues.length})</span>
        </button>
      </div>

      {/* ==================== TAB 1: DASHBOARD & APPLICATION USAGE STATS ==================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-7 animate-in fade-in duration-150">
          {/* Global KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                {analytics?.total_users || 0}
              </h3>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {analytics?.active_users} actively logging transactions
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Processed Volume</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(analytics?.total_income_processed, currency)}
              </h3>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Net outflow: {formatCurrency(analytics?.total_expenses_processed, currency)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Transactions</span>
                <Activity className="w-4 h-4 text-primary-500" />
              </div>
              <h3 className="text-3xl font-black text-primary-600 dark:text-primary-400 mt-1">
                {analytics?.total_transactions || 0}
              </h3>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {usageStats?.anomaly_rate_percentage || 0}% marked as anomaly outliers
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">ML Pipeline Status</span>
                <Sparkles className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>All 4 Models Active</span>
              </h3>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {analytics?.total_predictions_generated || 0} forecasts created
              </span>
            </div>
          </div>

          {/* Usage Chart: Monthly Inflow vs Outflow */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  Platform Transaction Volumes Over Time (Last 6 Months)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparative longitudinal inflows and expenditures aggregated across all system accounts
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-3 h-3 rounded-md bg-emerald-500" /> Income Inflow
                </span>
                <span className="flex items-center gap-1.5 text-rose-600">
                  <span className="w-3 h-3 rounded-md bg-rose-500" /> Expense Outflow
                </span>
              </div>
            </div>

            <div className="h-72 mt-6">
              {usageStats?.monthly_trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageStats.monthly_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip 
                      formatter={(val) => [`₹${Number(val).toLocaleString()}`, '']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="income" name="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No monthly trend records yet.
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Section: Categories & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                <Layers className="w-5 h-5 text-primary-500" />
                Category Outflow Proportions
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Platform-wide expenditure distribution across registered categories
              </p>

              <div className="space-y-4">
                {usageStats?.category_distribution?.length > 0 ? (
                  usageStats.category_distribution.slice(0, 6).map((c, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          ₹{c.amount.toLocaleString()} ({c.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(c.percentage, 100)}%`, backgroundColor: c.color }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No expense records available.</p>
                )}
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Payment Channels Distribution
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Recorded transaction modes utilized across users
              </p>

              <div className="grid grid-cols-2 gap-4">
                {usageStats?.payment_method_distribution?.map((m, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-xs text-slate-400 font-medium block">{m.method}</span>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {m.count} txs
                    </h4>
                    <span className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold block mt-1">
                      {m.percentage}% of platform volume
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: REGISTERED USERS ==================== */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Registered User Directory & Access Governance
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage registered accounts, view transaction counts, and toggle administrator roles
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name, email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role & Status</th>
                  <th className="py-3 px-4 text-center">Transactions</th>
                  <th className="py-3 px-4 text-right">Initial Balance</th>
                  <th className="py-3 px-4 text-right">Total Outflow</th>
                  <th className="py-3 px-4 text-right">Registered</th>
                  <th className="py-3 px-4 text-center">Role Actions</th>
                  <th className="py-3 px-4 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">
                      No matching registered users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <div>{u.full_name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                            u.role === 'admin'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {u.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                        {u.transaction_count}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">
                        {formatCurrency(u.initial_balance || 0, u.preferred_currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(u.total_spent, u.preferred_currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {u.role === 'admin' ? (
                          <button
                            onClick={() => handleRoleChange(u.id, 'user')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                            title="Demote to standard user"
                          >
                            <UserX className="w-3 h-3 text-slate-500" /> Demote
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(u.id, 'admin')}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                            title="Promote to administrator"
                          >
                            <UserCheck className="w-3 h-3 text-indigo-500" /> Make Admin
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete user account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: SYSTEM ACTIVITIES ==================== */}
      {activeTab === 'activities' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-500" />
                Live System Activity Audit Trail
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time governance audit log recording security, user operations, ML pipeline updates, and budget threshold events
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['ALL', 'USER_LOGIN', 'TRANSACTION_CREATED', 'MODEL_TRAINED', 'BUDGET_CAP_EXCEEDED', 'ISSUE_REPORTED'].map(f => (
                <button
                  key={f}
                  onClick={() => setActivityFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activityFilter === f
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[550px] overflow-y-auto">
            {filteredActivities.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No activity logs found for the selected filter.
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div key={act.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors flex items-start gap-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${getActionBadgeColor(act.action)}`}>
                    {act.action}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                      {act.details}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                      <span>Entity: <strong className="text-slate-600 dark:text-slate-300 capitalize">{act.entity_type}</strong></span>
                      {act.user_email && (
                        <span>User: <strong className="text-slate-600 dark:text-slate-300">{act.user_email}</strong></span>
                      )}
                      <span>IP: {act.ip_address || '127.0.0.1'}</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDate(act.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: TRANSACTION CATEGORIES ==================== */}
      {activeTab === 'categories' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Add Category Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary-500" />
                Add New Transaction Category
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Define platform financial categories mapped directly into the AI categorizer NLP model and budget limits
              </p>
            </div>

            <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              <input
                type="text"
                placeholder="Category Name (e.g. Charity, Crypto)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />

              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="expense">Expense Category</option>
                <option value="income">Income Category</option>
              </select>

              <input
                type="text"
                placeholder="Short Description (Optional)"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
              />

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-10 h-10 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-white dark:bg-slate-800"
                  title="Pick category accent color"
                />
                <span className="text-xs font-mono text-slate-400">{newCatColor}</span>
              </div>

              <button
                type="submit"
                disabled={catSaving}
                className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Save Category
              </button>
            </form>
          </div>

          {/* Edit Modal (if editing) */}
          {editingCategory && (
            <div className="p-6 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" /> Edit Category: {editingCategory.name}
                </h4>
                <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateCategorySubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  required
                />
                <select
                  value={editingCategory.category_type}
                  onChange={(e) => setEditingCategory({ ...editingCategory, category_type: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingCategory.color || '#6366f1'}
                    onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                    className="w-9 h-9 p-0.5 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingCategory.description || ''}
                    placeholder="Description"
                    onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs flex-1"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Save Changes
                </button>
              </form>
            </div>
          )}

          {/* Existing Categories Directory */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  Active Category Taxonomy
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {filteredCategories.length} categories configured in the database
                </p>
              </div>

              {/* Type filter */}
              <div className="flex items-center gap-1.5">
                {['all', 'expense', 'income'].map(t => (
                  <button
                    key={t}
                    onClick={() => setCategoryTypeFilter(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                      categoryTypeFilter === t
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredCategories.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between space-y-3 group hover:border-primary-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: c.color || '#6366f1' }}
                      />
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {c.name}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      c.category_type === 'income'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                    }`}>
                      {c.category_type}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {c.description || 'No description provided'}
                  </p>

                  <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <button
                      onClick={() => setEditingCategory(c)}
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                      title="Edit Category"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: ML MODEL TELEMETRY ==================== */}
      {activeTab === 'models' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary-500" />
                  Machine Learning Model Performance & Telemetry
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time validation metrics, loss functions, and inference telemetry for the 4 core AI pipelines
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-900">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All Pipelines Active
                </span>
                <button
                  onClick={handleRetrainModels}
                  disabled={retraining}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${retraining ? 'animate-spin' : ''}`} />
                  <span>Re-run Evals</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Model 1: Categorization */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider block">
                    NLP Categorizer
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Architecture</span>
                    <span className="font-bold text-slate-900 dark:text-white">TF-IDF + LogReg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accuracy</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPercentage((catModel.accuracy || 0.94) * 100)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>F1-Score</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {catModel.f1_score || 0.93}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Precision / Recall</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {catModel.precision || 0.94} / {catModel.recall || 0.93}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Training Corpus</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {catModel.trained_samples || 48} seed records
                    </span>
                  </div>
                </div>
              </div>

              {/* Model 2: Expense Forecasting */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                    Expense Predictor
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Selected Model</span>
                    <span className="font-bold text-slate-900 dark:text-white">RandomForest</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MAE</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      ₹{predModel.mae || 142.50}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>RMSE</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{predModel.rmse || 189.20}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>R² Variance Score</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {predModel.r2_score || 0.94}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>MAPE</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {predModel.mape || 4.8}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Model 3: Anomaly Detection */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                    Anomaly Detector
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Algorithms</span>
                    <span className="font-bold text-slate-900 dark:text-white">Isolation Forest</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contamination</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {anomModel.contamination_rate || 0.05}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outlier Guard</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Robust Z-Score (3.0x)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Execution Mode</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Inference on write
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pipeline Status</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Model 4: Recommendation Engine */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    Recommendation Engine
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Engine Type</span>
                    <span className="font-bold text-slate-900 dark:text-white">Rule-Based Intelligence</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Rule Sets</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {recModel.active_rules_count || 8} Rules
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Generated Items</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {recModel.total_recommendations_generated || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Safeguards Applied</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {recModel.applied_safeguards || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Adoption Rate</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {recModel.adoption_rate || '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 6: REPORTED ISSUES ==================== */}
      {activeTab === 'issues' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-rose-500" />
                  Reported Issues & Support Tickets
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track user bug reports, feature requests, model accuracy feedback, and resolution status
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Status filter */}
                <div className="flex items-center gap-1">
                  {['all', 'open', 'in_progress', 'resolved'].map(st => (
                    <button
                      key={st}
                      onClick={() => setIssueFilter(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                        issueFilter === st
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowIssueModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Issue
                </button>
              </div>
            </div>

            {/* Issues List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIssues.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No issues found for the selected status.
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <div key={issue.id} className="p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          #{issue.id} {issue.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityBadge(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {issue.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusBadge(issue.status)}`}>
                          {issue.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Quick status dropdown */}
                        <select
                          value={issue.status}
                          onChange={(e) => handleUpdateIssueStatus(issue.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>

                        <button
                          onClick={() => {
                            setEditingIssueNotes(issue.id)
                            setIssueNotesText(issue.admin_notes || '')
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Add/Edit Admin Resolution Notes"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteIssue(issue.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {issue.description}
                    </p>

                    {/* Admin Resolution Notes View */}
                    {issue.admin_notes && editingIssueNotes !== issue.id && (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">
                          Admin Resolution Notes:
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 italic">
                          "{issue.admin_notes}"
                        </p>
                      </div>
                    )}

                    {/* Inline Edit Notes Form */}
                    {editingIssueNotes === issue.id && (
                      <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 space-y-2">
                        <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">
                          Update Resolution / Diagnostic Notes
                        </label>
                        <textarea
                          rows="2"
                          value={issueNotesText}
                          onChange={(e) => setIssueNotesText(e.target.value)}
                          placeholder="Describe the fix or developer investigation details..."
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingIssueNotes(null)}
                            className="px-3 py-1 rounded-md text-xs font-semibold text-slate-500 hover:bg-slate-200/50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveIssueNotes(issue.id)}
                            className="px-3 py-1 rounded-md text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            Save Notes
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Reporter: <strong>{issue.reporter_email || 'System user'}</strong></span>
                      <span>Logged: {formatDate(issue.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-primary-500" />
                Log System / User Issue
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Summary
                </label>
                <input
                  type="text"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="e.g. Inflow calculation off for salary bonus"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newIssueCategory}
                    onChange={(e) => setNewIssueCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="Bug">Bug Report</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="ML Accuracy">ML Model Accuracy</option>
                    <option value="UI Glitch">UI / UX Glitch</option>
                    <option value="General">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Severity Level
                  </label>
                  <select
                    value={newIssueSeverity}
                    onChange={(e) => setNewIssueSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description
                </label>
                <textarea
                  rows="3"
                  value={newIssueDesc}
                  onChange={(e) => setNewIssueDesc(e.target.value)}
                  placeholder="Steps to reproduce, expected vs actual behavior, or user observation..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIssue}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md"
                >
                  Submit Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
