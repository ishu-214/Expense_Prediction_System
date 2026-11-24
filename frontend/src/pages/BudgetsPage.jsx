import React, { useState, useEffect } from 'react'
import {
  PiggyBank,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Edit2,
  Trash2,
  TrendingUp,
  Percent
} from 'lucide-react'
import { budgetsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatPercentage } from '../utils/formatters'
import BudgetModal from '../components/BudgetModal'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'

export const BudgetsPage = () => {
  const { currency } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState(null)

  const fetchBudgets = async (targetMonth = month, targetYear = year) => {
    try {
      setLoading(true)
      const res = await budgetsAPI.list({ month: targetMonth, year: targetYear })
      setBudgets(res.data)
    } catch (err) {
      console.error('Failed to load budgets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgets(month, year)
  }, [month, year])

  const handleBudgetSuccess = (newMonth, newYear) => {
    if (newMonth && newYear) {
      setMonth(newMonth)
      setYear(newYear)
      fetchBudgets(newMonth, newYear)
    } else {
      fetchBudgets(month, year)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await budgetsAPI.delete(id)
        fetchBudgets()
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleEdit = (b) => {
    setSelectedBudget(b)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setSelectedBudget(null)
    setIsModalOpen(true)
  }

  const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.monthly_limit, 0)
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spent_amount || 0), 0)
  const totalRemaining = Math.max(totalBudgetLimit - totalSpent, 0)
  const overallUtilization = totalBudgetLimit > 0 ? (totalSpent / totalBudgetLimit) * 100 : 0

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Budget Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track planned vs actual expenditures with active limit threshold monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month/Year Filters */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <button
            onClick={handleCreate}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Budget
          </button>
        </div>
      </div>

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Total Monthly Budget</span>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalBudgetLimit, currency)}
          </h3>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {budgets.length} configured categories
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Actual Spent So Far</span>
          <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalSpent, currency)}
          </h3>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Utilization: {formatPercentage(overallUtilization)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Remaining Total Margin</span>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalRemaining, currency)}
          </h3>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Available to spend this month
          </span>
        </div>
      </div>

      {/* Category Budgets Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Category Budget Breakdown
          </h3>
          <span className="text-xs text-slate-400">
            {months.find((m) => m.num === month)?.name} {year}
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton count={3} />
        ) : budgets.length === 0 ? (
          <EmptyState
            title="No budgets set for this month"
            description="Create category budgets to establish spending guardrails and receive alerts when limits are approached."
            actionText="Create Budget"
            onAction={handleCreate}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {budgets.map((b) => {
              const util = b.utilization_percentage || 0
              const isOver = b.is_exceeded
              const isClose = util >= 85 && !isOver

              return (
                <div
                  key={b.id}
                  className={`p-6 rounded-2xl border transition-all ${
                    isOver
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                      : isClose
                      ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: b.category?.color || '#6366f1' }}
                      />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {b.category?.name || 'Category'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isOver && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                          <AlertTriangle className="w-3 h-3" /> Exceeded
                        </span>
                      )}
                      {isClose && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3" /> Approaching
                        </span>
                      )}
                      <button
                        onClick={() => handleEdit(b)}
                        className="p-1 rounded text-slate-400 hover:text-primary-600"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-baseline justify-between mt-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Spent</span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {formatCurrency(b.spent_amount, currency)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Budget Limit</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(b.monthly_limit, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3.5">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver
                            ? 'bg-rose-500'
                            : isClose
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(util, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                      <span>{formatPercentage(util)} utilized</span>
                      <span>
                        {isOver
                          ? `₹${Math.round(b.spent_amount - b.monthly_limit)} over limit`
                          : `${formatCurrency(b.remaining_amount, currency)} left`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleBudgetSuccess}
        budget={selectedBudget}
        defaultMonth={month}
        defaultYear={year}
      />
    </div>
  )
}

export default BudgetsPage
