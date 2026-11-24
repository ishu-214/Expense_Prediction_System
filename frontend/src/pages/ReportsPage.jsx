import React, { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  FileCheck2,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts'
import { analyticsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatPercentage } from '../utils/formatters'
import LoadingSkeleton from '../components/LoadingSkeleton'

export const ReportsPage = () => {
  const { currency, token } = useAuth()
  const [period, setPeriod] = useState('monthly') // 'daily', 'weekly', 'monthly', 'annual'
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)

  const fetchReport = async () => {
    try {
      setLoading(true)
      const res = await analyticsAPI.getReports(period)
      setReportData(res.data)
    } catch (err) {
      console.error('Failed to load report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [period])

  const handleDownloadCSV = async () => {
    try {
      setExportingCSV(true)
      const res = await analyticsAPI.exportCSV()
      const blob = new Blob([res.data], { type: 'text/csv' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = `transactions_report_${period}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Failed to export CSV:', err)
      alert('Failed to download CSV report.')
    } finally {
      setExportingCSV(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setExportingPDF(true)
      const res = await analyticsAPI.exportPDF()
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = `financial_analytics_report_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Failed to export PDF:', err)
      alert('Failed to download PDF report.')
    } finally {
      setExportingPDF(false)
    }
  }

  const chartData = reportData?.data || []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate longitudinal cash flow reports and export audit-ready PDF/CSV files
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCSV}
            disabled={exportingCSV}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-500 text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            {exportingCSV ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={exportingPDF}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportingPDF ? 'Generating...' : 'Export PDF Report'}
          </button>
        </div>
      </div>

      {/* Period Selection Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-800">
        {[
          { id: 'daily', label: 'Daily Reports' },
          { id: 'weekly', label: 'Weekly Reports' },
          { id: 'monthly', label: 'Monthly Reports' },
          { id: 'annual', label: 'Annual Financials' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPeriod(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              period === tab.id
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Analytics Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Income, Expenses & Savings Dynamics
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregated over {chartData.length} {period} periods
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton count={3} />
        ) : chartData.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Transactions Recorded in this Period
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Transactions logged under your account will automatically aggregate into dynamic cashflow curves here.
            </p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `₹${Math.round(val / 1000)}k` : `₹${val}`)}
                />
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
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                  fillOpacity={1}
                  fill="url(#colorInc)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f43f5e' }}
                  activeDot={{ r: 6 }}
                  fillOpacity={1}
                  fill="url(#colorExp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Structured Ledger Summary Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Tabular Period Performance Breakdown
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Granularity: {period.toUpperCase()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-right">Income</th>
                <th className="py-3 px-4 text-right">Expenses</th>
                <th className="py-3 px-4 text-right">Net Savings</th>
                <th className="py-3 px-4 text-right">Savings Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {chartData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                    {row.period}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.income, currency)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-rose-600 dark:text-rose-400">
                    {formatCurrency(row.expense, currency)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(row.savings, currency)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-primary-600 dark:text-primary-400">
                    {formatPercentage(row.savings_rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
