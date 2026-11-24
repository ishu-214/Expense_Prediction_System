import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  Plus,
  UploadCloud,
  Sparkles,
  ArrowRight,
  BarChart2,
  Calendar,
  Coins
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts'
import { analyticsAPI, predictionsAPI, authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatPercentage, formatDate } from '../utils/formatters'
import StatCard from '../components/StatCard'
import TransactionModal from '../components/TransactionModal'
import CSVUploadModal from '../components/CSVUploadModal'
import LoadingSkeleton from '../components/LoadingSkeleton'

export const DashboardPage = () => {
  const { user, currency, updateUser } = useAuth()
  const [data, setData] = useState(null)
  const [predictions, setPredictions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAddTxOpen, setIsAddTxOpen] = useState(false)
  const [isCSVOpen, setIsCSVOpen] = useState(false)
  const [newInitialBal, setNewInitialBal] = useState('')
  const [savingBal, setSavingBal] = useState(false)

  const handleSaveInitialBalance = async (e) => {
    if (e) e.preventDefault()
    if (!newInitialBal || isNaN(newInitialBal)) return
    try {
      setSavingBal(true)
      const res = await authAPI.updateProfile({
        initial_balance: parseFloat(newInitialBal)
      })
      if (updateUser) updateUser(res.data)
      setNewInitialBal('')
      await fetchDashboardData()
    } catch (err) {
      console.error('Failed to update initial balance:', err)
    } finally {
      setSavingBal(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [dashRes, predRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        predictionsAPI.getExpenses()
      ])
      setData(dashRes.data)
      setPredictions(predRes.data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton count={4} />
      </div>
    )
  }

  const categoryData = data?.category_breakdown?.slice(0, 6) || []

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial Intelligence Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.full_name}</span>. Here is your financial overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCSVOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-primary-500 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-primary-500" />
            Import CSV
          </button>
          <button
            onClick={() => setIsAddTxOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Starting Balance Prompt / Setup Banner */}
      {(!data?.initial_balance || data?.initial_balance === 0) && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Set Your Starting Balance / Initial Savings
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Setup
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tell FinanceAI how much money you currently have in hand or bank. This ensures exact net worth tracking and helps detect wasted money.
              </p>
            </div>
          </div>
          <form onSubmit={handleSaveInitialBalance} className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              step="100"
              placeholder="e.g. 50000"
              value={newInitialBal}
              onChange={(e) => setNewInitialBal(e.target.value)}
              className="w-36 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={savingBal || !newInitialBal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              {savingBal ? 'Saving...' : 'Set Balance'}
            </button>
          </form>
        </div>
      )}

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Net Balance"
          value={formatCurrency(data?.total_balance, currency)}
          subtitle={
            data?.initial_balance > 0
              ? `Base savings: ${formatCurrency(data?.initial_balance, currency)}`
              : "Net accumulated balance"
          }
          icon={Wallet}
          iconColor="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400"
        />
        <StatCard
          title="Total Recorded Income"
          value={formatCurrency(data?.total_income, currency)}
          subtitle="All income sources"
          changeType="positive"
          icon={ArrowDownRight}
          iconColor="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <StatCard
          title="Total Recorded Expenses"
          value={formatCurrency(data?.total_expenses, currency)}
          subtitle="Overall spending"
          changeType="negative"
          icon={ArrowUpRight}
          iconColor="text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400"
        />
        <StatCard
          title="Monthly Savings Rate"
          value={formatPercentage(data?.savings_rate)}
          subtitle={`Saved: ${formatCurrency(data?.monthly_savings, currency)} this month`}
          changeType={data?.savings_rate >= 20 ? 'positive' : 'negative'}
          icon={PiggyBank}
          iconColor="text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400"
        />
      </div>

      {/* AI Financial Insights & ML Prediction Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic AI Insights Engine Output */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight">AI Financial Insights Engine</h3>
                <span className="text-[11px] text-indigo-200">Real-time heuristics & pattern intelligence</span>
              </div>
            </div>
            <Link
              to="/recommendations"
              className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              View Advice <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-5 space-y-3 relative z-10">
            {data?.ai_insights?.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-md transition-colors border border-white/5"
              >
                <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                  {insight}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ML Forecast Summary Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> ML Expense Forecast
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Next Month
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400">Predicted Monthly Outflow</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                {formatCurrency(predictions?.next_month_predicted_total, currency)}
              </h3>
            </div>

            <div className="mt-5 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span>Model Architecture</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                  {predictions?.model_name?.split(' ')[0] || 'RandomForest'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span>Expected Monthly Income</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(predictions?.expected_income, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span>Projected Net Savings</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(predictions?.predicted_savings, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Prediction Confidence</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.round((predictions?.confidence_score || 0.85) * 100)}%
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/predictions"
            className="mt-6 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-bold text-center block transition-colors"
          >
            Explore Detailed Predictions
          </Link>
        </div>
      </div>

      {/* Interactive Charts: Monthly Income vs Expenses & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Monthly Income vs Expenses Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real historical transaction cash flows</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthly_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  formatter={(val) => formatCurrency(val, currency)}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Category Distribution
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Where your money goes</p>

            {categoryData.length > 0 ? (
              <>
                <div className="h-56 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="amount"
                        nameKey="category_name"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => formatCurrency(val, currency)}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #1e293b',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {categoryData.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color || '#6366f1' }}
                        />
                        <span className="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[120px]">
                          {cat.category_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(cat.amount, currency)}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Expenses Recorded Yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Add your expenses or upload a statement to view your category breakdown.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest financial movements recorded</p>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Title / Merchant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(!data?.recent_transactions || data.recent_transactions.length === 0) ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                    No transactions recorded yet. Click &quot;Add Transaction&quot; or &quot;Import CSV&quot; above to start!
                  </td>
                </tr>
              ) : (
                data.recent_transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {t.title}
                      {t.is_anomaly && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Unusual
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">
                        {t.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(t.transaction_date)}</td>
                    <td className="py-3 px-4 text-slate-500">{t.payment_method}</td>
                    <td
                      className={`py-3 px-4 font-bold text-right ${
                        t.transaction_type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {t.transaction_type === 'income' ? '+' : '-'} {formatCurrency(t.amount, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onSuccess={fetchDashboardData}
      />
      <CSVUploadModal
        isOpen={isCSVOpen}
        onClose={() => setIsCSVOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  )
}

export default DashboardPage
