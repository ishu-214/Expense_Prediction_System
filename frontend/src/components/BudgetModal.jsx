import React, { useState, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { budgetsAPI, categoriesAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export const BudgetModal = ({
  isOpen,
  onClose,
  onSuccess,
  budget = null,
  defaultMonth,
  defaultYear
}) => {
  const { currency } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  const [formData, setFormData] = useState({
    category_id: '',
    monthly_limit: '',
    month: defaultMonth || (now.getMonth() + 1),
    year: defaultYear || now.getFullYear()
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesAPI.list()
        setCategories(res.data.filter(c => c.category_type === 'expense'))
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      }
    }
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  useEffect(() => {
    if (budget) {
      setFormData({
        category_id: budget.category_id || '',
        monthly_limit: budget.monthly_limit || '',
        month: budget.month || defaultMonth || (now.getMonth() + 1),
        year: budget.year || defaultYear || now.getFullYear()
      })
    } else {
      setFormData({
        category_id: '',
        monthly_limit: '',
        month: defaultMonth || (now.getMonth() + 1),
        year: defaultYear || now.getFullYear()
      })
    }
    setError('')
  }, [budget, isOpen, defaultMonth, defaultYear])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.category_id) {
      setError('Please select an expense category')
      return
    }
    if (!formData.monthly_limit || Number(formData.monthly_limit) <= 0) {
      setError('Please enter a valid monthly limit greater than 0')
      return
    }

    try {
      setLoading(true)
      setError('')
      const payload = {
        category_id: parseInt(formData.category_id),
        monthly_limit: parseFloat(formData.monthly_limit),
        month: parseInt(formData.month),
        year: parseInt(formData.year)
      }

      if (budget?.id) {
        await budgetsAPI.update(budget.id, payload)
      } else {
        await budgetsAPI.create(payload)
      }

      window.dispatchEvent(new Event('refreshNotifications'))

      if (onSuccess) {
        onSuccess(parseInt(formData.month), parseInt(formData.year))
      }
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Failed to save budget')
    } finally {
      setLoading(false)
    }
  }

  const months = [
    { num: 1, name: 'January' },
    { num: 2, name: 'February' },
    { num: 3, name: 'March' },
    { num: 4, name: 'April' },
    { num: 5, name: 'May' },
    { num: 6, name: 'June' },
    { num: 7, name: 'July' },
    { num: 8, name: 'August' },
    { num: 9, name: 'September' },
    { num: 10, name: 'October' },
    { num: 11, name: 'November' },
    { num: 12, name: 'December' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {budget ? 'Edit Budget' : 'Set Category Budget'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Set spending limits to keep finances on track
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Expense Category *
            </label>
            <select
              value={formData.category_id}
              disabled={!!budget}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
              required
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Monthly Limit ({currency}) *
            </label>
            <input
              type="number"
              step="100"
              placeholder="e.g. 15000"
              value={formData.monthly_limit}
              onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Month
              </label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {months.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Year
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-all shadow-md shadow-primary-500/20 disabled:opacity-50"
            >
              {loading ? 'Saving...' : budget ? 'Update Budget' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BudgetModal
