import React, { useState, useEffect } from 'react'
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  TrendingUp,
  Coins
} from 'lucide-react'
import { goalsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatPercentage, formatDate } from '../utils/formatters'
import GoalModal from '../components/GoalModal'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'

export const GoalsPage = () => {
  const { currency } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)

  const fetchGoals = async () => {
    try {
      setLoading(true)
      const res = await goalsAPI.list()
      setGoals(res.data)
    } catch (err) {
      console.error('Failed to load goals:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this savings goal?')) {
      try {
        await goalsAPI.delete(id)
        fetchGoals()
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleEdit = (g) => {
    setSelectedGoal(g)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setSelectedGoal(null)
    setIsModalOpen(true)
  }

  const handleAddFunds = async (goal) => {
    const amountStr = window.prompt(`Enter amount to add toward "${goal.goal_name}":`)
    if (!amountStr) return
    const addAmt = parseFloat(amountStr)
    if (isNaN(addAmt) || addAmt <= 0) {
      alert('Please enter a valid positive number.')
      return
    }

    try {
      const updatedCurrent = (goal.current_amount || 0) + addAmt
      await goalsAPI.update(goal.id, { current_amount: updatedCurrent })
      window.dispatchEvent(new Event('refreshNotifications'))
      fetchGoals()
    } catch (err) {
      console.error(err)
    }
  }

  const handleCancelGoal = async (goal) => {
    if (window.confirm(`Are you sure you want to cancel the goal "${goal.goal_name}"?`)) {
      try {
        await goalsAPI.update(goal.id, { status: 'cancelled' })
        window.dispatchEvent(new Event('refreshNotifications'))
        fetchGoals()
      } catch (err) {
        console.error('Failed to cancel goal:', err)
      }
    }
  }

  const handleReactivate = async (goal) => {
    try {
      const newStatus = (goal.current_amount >= goal.target_amount) ? 'achieved' : 'in_progress'
      await goalsAPI.update(goal.id, { status: newStatus })
      window.dispatchEvent(new Event('refreshNotifications'))
      fetchGoals()
    } catch (err) {
      console.error('Failed to reactivate goal:', err)
    }
  }

  const activeGoals = goals.filter(g => g.status !== 'cancelled')
  const totalTarget = activeGoals.reduce((acc, g) => acc + g.target_amount, 0)
  const totalSaved = activeGoals.reduce((acc, g) => acc + g.current_amount, 0)
  const totalRemaining = Math.max(totalTarget - totalSaved, 0)
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial Savings Goals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Establish target milestones and monitor cumulative savings velocity
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Create New Goal
        </button>
      </div>

      {/* Aggregate Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Total Target Capital</span>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalTarget, currency)}
          </h3>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {goals.length} active savings milestones
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Accumulated Savings</span>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalSaved, currency)}
          </h3>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Overall progress: {formatPercentage(overallProgress)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Remaining to Goal</span>
          <h3 className="text-2xl font-black text-primary-600 dark:text-primary-400 mt-1">
            {formatCurrency(totalRemaining, currency)}
          </h3>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Target capital left to accumulate
          </span>
        </div>
      </div>

      {/* Goals Cards List */}
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No financial goals created"
          description="Create savings targets (e.g. Emergency Fund, New Laptop, Vehicle Downpayment) to stay motivated and track your progress."
          actionText="Create Savings Goal"
          onAction={handleCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const isCancelled = goal.status === 'cancelled'
            const isAchieved = !isCancelled && (goal.status === 'achieved' || goal.progress_percentage >= 100)

            return (
              <div
                key={goal.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border shadow-sm flex flex-col justify-between hover:shadow-md transition-all ${
                  isCancelled
                    ? 'border-rose-200/80 dark:border-rose-900/40 bg-slate-50/50 dark:bg-slate-900/50'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isCancelled
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          : isAchieved
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
                      }`}
                    >
                      {isCancelled ? 'Cancelled ✕' : isAchieved ? 'Achieved 🏆' : 'In Progress'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isCancelled ? (
                        <button
                          onClick={() => handleReactivate(goal)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
                          title="Reactivate Goal"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancelGoal(goal)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Cancel Goal"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(goal)}
                        className="p-1 rounded text-slate-400 hover:text-primary-600"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {goal.goal_name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Target Date: {formatDate(goal.target_date)}</span>
                  </div>

                  {/* Amounts breakdown */}
                  <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Amount</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(goal.target_amount, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Savings</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(goal.current_amount, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5">
                      <span className="text-slate-400">Remaining Amount</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(goal.remaining_amount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      <span>Progress</span>
                      <span>{formatPercentage(goal.progress_percentage)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCancelled ? 'bg-slate-400 dark:bg-slate-600' : isAchieved ? 'bg-emerald-500' : 'bg-primary-600'
                        }`}
                        style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800">
                  {isCancelled ? (
                    <button
                      onClick={() => handleReactivate(goal)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      Reactivate Goal
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddFunds(goal)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      + Add Saved Funds
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchGoals}
        goal={selectedGoal}
      />
    </div>
  )
}

export default GoalsPage
