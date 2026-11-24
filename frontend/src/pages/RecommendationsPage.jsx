import React, { useState, useEffect } from 'react'
import {
  Lightbulb,
  Sparkles,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Coins,
  ShieldCheck,
  Flame,
  Undo2
} from 'lucide-react'
import { recommendationsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatPercentage } from '../utils/formatters'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'

export const RecommendationsPage = () => {
  const { currency } = useAuth()
  const [allRecs, setAllRecs] = useState([])
  const [wasteData, setWasteData] = useState(null)
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'applied'
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [actionNotice, setActionNotice] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [recsRes, wasteRes] = await Promise.all([
        recommendationsAPI.list('all'),
        recommendationsAPI.getWasteAnalysis()
      ])
      setAllRecs(recsRes.data)
      setWasteData(wasteRes.data)
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRegenerate = async () => {
    try {
      setGenerating(true)
      const [res, wasteRes] = await Promise.all([
        recommendationsAPI.generate(),
        recommendationsAPI.getWasteAnalysis()
      ])
      setAllRecs(res.data)
      setWasteData(wasteRes.data)
      setActionNotice('AI heuristics successfully re-calculated across your latest transactions!')
      setTimeout(() => setActionNotice(''), 4000)
    } catch (err) {
      console.error('Failed to generate recommendations:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await recommendationsAPI.updateStatus(id, newStatus)
      setAllRecs((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      )
      if (newStatus === 'applied') {
        setActionNotice('Action Plan successfully activated! Guardrail is now applied and monitored.')
      } else if (newStatus === 'active') {
        setActionNotice('Safeguard restored back to active recommendations.')
      } else {
        setActionNotice('Recommendation dismissed.')
      }
      setTimeout(() => setActionNotice(''), 4000)
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const activeRecs = allRecs.filter((r) => r.status === 'active')
  const appliedRecs = allRecs.filter((r) => r.status === 'applied')
  const currentList = activeTab === 'active' ? activeRecs : appliedRecs

  const totalPotentialSavings = activeRecs.reduce(
    (acc, r) => acc + (r.estimated_savings || 0),
    0
  )

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
            High Impact
          </span>
        )
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
            Medium Priority
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Low Priority
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 text-xs font-bold mb-2 border border-primary-200/50 dark:border-primary-800/50">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>AI Waste Detection & Recommendation Engine (Model 4)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Personalized Saving Recommendations & Waste Detector
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Data-backed optimization suggestions and non-essential spending leak analysis
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={generating}
          className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Re-analyzing Patterns...' : 'Re-run AI Analysis'}
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* AI Waste & Money Leak Detection Panel */}
      {wasteData && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  AI Waste & Money Leak Analysis
                </h3>
                <span className="text-[11px] text-slate-400">
                  Real-time discretionary outflow and wasteful transaction inspection
                </span>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                wasteData.waste_status === 'High Discretionary'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
              }`}
            >
              {wasteData.waste_status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                Discretionary / Non-Essential Spent
              </span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                {formatCurrency(wasteData.discretionary_total, currency)}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {wasteData.discretionary_percentage}% of your total outflow
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                Erratic Spikes & Outliers
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                {wasteData.anomaly_count} Anomalies Flagged
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Isolation Forest outlier detector
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                Potential Leak Prevention
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                ~{formatCurrency(Math.round(wasteData.discretionary_total * 0.25), currency)}/mo
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Recoverable via 48-hour spending pause
              </span>
            </div>
          </div>

          {wasteData.leaks && wasteData.leaks.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Identified Discretionary Items:
              </span>
              <div className="flex flex-wrap gap-2">
                {wasteData.leaks.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs flex items-center gap-2"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white capitalize">
                      {item.title}
                    </span>
                    <span className="text-slate-400">({item.category})</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Potential Savings Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider block">
            Calculated Monthly Saving Potential
          </span>
          <h2 className="text-3xl sm:text-4xl font-black">
            {formatCurrency(totalPotentialSavings, currency)}
            <span className="text-sm font-semibold text-emerald-100 ml-2">/ month</span>
          </h2>
          <p className="text-xs text-emerald-100 max-w-lg mt-1 leading-relaxed">
            Derived from recurring subscription audits, discretionary expense spikes, and budget limit restorations.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-3 relative z-10">
          <Coins className="w-8 h-8 text-emerald-200" />
          <div className="text-xs">
            <span className="font-bold block">Annualized Potential</span>
            <span className="text-emerald-100 font-semibold text-sm">
              {formatCurrency(totalPotentialSavings * 12, currency)} / year
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Active vs Applied */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Active Recommendations</span>
          <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-[10px]">
            {activeRecs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('applied')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'applied'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Applied Safeguards</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px]">
            {appliedRecs.length}
          </span>
        </button>
      </div>

      {/* Recommendations Cards List */}
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : currentList.length === 0 ? (
        <EmptyState
          icon={activeTab === 'active' ? Lightbulb : ShieldCheck}
          title={
            activeTab === 'active'
              ? 'No active recommendations pending'
              : 'No applied safeguards yet'
          }
          description={
            activeTab === 'active'
              ? 'All suggested safeguards have been applied or dismissed! Re-run analysis anytime as you add more transactions.'
              : 'Click "Apply Action" on any active recommendation to implement it and track it here.'
          }
          actionText={activeTab === 'active' ? 'Re-run AI Analysis' : null}
          onAction={activeTab === 'active' ? handleRegenerate : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {currentList.map((rec) => (
            <div
              key={rec.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(rec.priority)}
                    {rec.status === 'applied' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Applied Action
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    Save ~{formatCurrency(rec.estimated_savings, currency)}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                  {rec.recommendation_title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                  {rec.description}
                </p>

                {rec.supporting_data && (
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">
                      Supporting Evidence:
                    </strong>
                    {rec.supporting_data}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-100 dark:border-slate-800">
                {rec.status === 'active' ? (
                  <>
                    <button
                      onClick={() => handleStatusChange(rec.id, 'dismissed')}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Dismiss
                    </button>

                    <button
                      onClick={() => handleStatusChange(rec.id, 'applied')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Apply Action
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleStatusChange(rec.id, 'active')}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Move Back to Active
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecommendationsPage
