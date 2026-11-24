import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Bell, 
  CheckCheck, 
  AlertTriangle, 
  Info, 
  Target, 
  Sparkles, 
  Check, 
  Trash2, 
  X, 
  ArrowRight,
  TrendingDown,
  ShoppingBag
} from 'lucide-react'
import { notificationsAPI } from '../services/api'
import { formatDate } from '../utils/formatters'

export const NotificationDropdown = () => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('unread') // 'unread' | 'all'
  const dropdownRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await notificationsAPI.list()
      setNotifications(res.data || [])
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    const handleRefresh = () => fetchNotifications()
    window.addEventListener('refreshNotifications', handleRefresh)
    window.addEventListener('focus', handleRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('refreshNotifications', handleRefresh)
      window.removeEventListener('focus', handleRefresh)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getTargetRoute = (n) => {
    const type = (n.notification_type || '').toLowerCase()
    const title = (n.notification_title || '').toLowerCase()
    const msg = (n.message || '').toLowerCase()

    if (type === 'budget_alert' || title.includes('budget') || msg.includes('budget')) {
      return { path: '/budgets', label: 'View Budgets' }
    }
    if (type === 'anomaly' || title.includes('transaction') || msg.includes('transaction') || title.includes('unusual')) {
      return { path: '/transactions', label: 'View Transactions' }
    }
    if (type === 'goal' || title.includes('goal') || msg.includes('goal')) {
      return { path: '/goals', label: 'View Goals' }
    }
    if (type === 'prediction' || title.includes('prediction') || title.includes('forecast') || msg.includes('forecast')) {
      return { path: '/predictions', label: 'View Predictions' }
    }
    if (type === 'recommendation' || title.includes('saving') || title.includes('recommend') || msg.includes('recommend')) {
      return { path: '/recommendations', label: 'View Recommendations' }
    }
    return { path: '/dashboard', label: 'Open Dashboard' }
  }

  const handleNotificationClick = async (n) => {
    const target = getTargetRoute(n)
    
    // Automatically mark read in backend if unread
    if (!n.is_read) {
      try {
        await notificationsAPI.markRead(n.id)
      } catch (err) {
        console.error('Failed to mark read on click:', err)
      }
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item))
    }

    setOpen(false)
    navigate(target.path)
  }

  const handleMarkRead = async (id, e) => {
    e.stopPropagation()
    try {
      await notificationsAPI.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemoveNotification = async (id, e) => {
    e.stopPropagation()
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      await notificationsAPI.delete(id)
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  const handleClearAll = async (e) => {
    if (e) e.stopPropagation()
    setNotifications([])
    try {
      await notificationsAPI.clearAll(false)
    } catch (err) {
      console.error('Failed to clear notifications:', err)
      fetchNotifications()
    }
  }

  const getIcon = (type, title = '') => {
    const t = (type || '').toLowerCase()
    const tit = (title || '').toLowerCase()

    if (t === 'budget_alert' || tit.includes('budget')) {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />
    }
    if (t === 'anomaly' || tit.includes('unusual')) {
      return <AlertTriangle className="w-4 h-4 text-rose-500" />
    }
    if (t === 'goal' || tit.includes('goal')) {
      return <Target className="w-4 h-4 text-emerald-500" />
    }
    if (t === 'prediction' || tit.includes('prediction')) {
      return <Sparkles className="w-4 h-4 text-primary-500" />
    }
    return <Info className="w-4 h-4 text-slate-500" />
  }

  // Filter list based on selected tab: unread or all
  const displayedNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-semibold">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={(e) => handleClearAll(e)}
                    className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 font-medium transition-colors ml-1"
                    title="Delete all notifications"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs: Unread vs All */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs font-medium">
              <button
                onClick={() => setActiveTab('unread')}
                className={`flex-1 py-1 px-2.5 rounded-md text-center transition-all ${
                  activeTab === 'unread'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-1 px-2.5 rounded-md text-center transition-all ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All History {notifications.length > 0 && `(${notifications.length})`}
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {displayedNotifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications in history'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {activeTab === 'unread' 
                    ? 'All caught up! Read items move to history.' 
                    : 'You have no alerts at this time.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((n) => {
                const target = getTargetRoute(n)
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`group p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all flex items-start gap-3 relative ${
                      !n.is_read ? 'bg-primary-50/30 dark:bg-primary-950/15' : 'opacity-85'
                    }`}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 group-hover:scale-105 transition-transform">
                      {getIcon(n.notification_type, n.notification_title)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs truncate ${!n.is_read ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                          {n.notification_title}
                        </p>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-0.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {formatDate(n.created_at)}
                        </span>
                        <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          {target.label} <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>

                    {/* Action buttons on hover */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      {!n.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(n.id, e)}
                          title="Mark as read"
                          className="p-1 rounded-md text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleRemoveNotification(n.id, e)}
                        title="Remove notification"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
