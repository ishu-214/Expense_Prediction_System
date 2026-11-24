import React from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  TrendingUp,
  BrainCircuit,
  ShieldAlert,
  PiggyBank,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export const LandingPage = () => {
  const { isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const features = [
    {
      icon: BrainCircuit,
      title: 'Automatic NLP Categorization',
      desc: 'Classifies every transaction using TF-IDF and Logistic Regression. Supports user corrections to continuously retrain the model.'
    },
    {
      icon: TrendingUp,
      title: 'Time-Series Expense Forecasting',
      desc: 'Ensemble Random Forest Regressors and rolling lag models predict next month’s total, weekly breakdowns, and category expenses.'
    },
    {
      icon: ShieldAlert,
      title: 'Intelligent Anomaly Detection',
      desc: 'Isolation Forests and category Z-score heuristics spot unusual deviations, spikes, and outliers with transparent explanations.'
    },
    {
      icon: PiggyBank,
      title: 'Personalized Saving Recommendations',
      desc: 'Identifies recurring subscriptions, runaway food orders, discretionary creep, and generates concrete savings plans.'
    },
    {
      icon: FileSpreadsheet,
      title: 'Seamless Bank Statement CSV Import',
      desc: 'Upload CSV bank statements with automatic column mapping, duplicate detection, transaction preview, and zero password requirements.'
    },
    {
      icon: Layers,
      title: 'Budget Tracking & Alerts',
      desc: 'Set category-wise monthly limits with real-time utilization progress bars, remaining margins, and threshold warnings.'
    }
  ]

  const howItWorks = [
    {
      step: '01',
      title: 'Upload or Add Transactions',
      desc: 'Import your CSV statement or log daily cash, UPI, and card purchases in seconds.'
    },
    {
      step: '02',
      title: 'Machine Learning Processing',
      desc: 'Our models vectorize narration texts, compute anomaly scores, and project future cash flows.'
    },
    {
      step: '03',
      title: 'Actionable Financial Health',
      desc: 'Receive tailored budget recommendations, reach savings goals faster, and optimize wealth.'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Navigation */}
      <header className="h-20 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">
              Finance<span className="text-primary-600 dark:text-primary-400">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-1.5"
              >
                Go to Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 text-xs font-bold border border-primary-200/50 dark:border-primary-800/50 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Advanced AI & Machine Learning Personal Finance Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
          Master Your Money with <br />
          <span className="bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Predictive AI & Spending Intelligence
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Forecast upcoming monthly expenses, detect unusual transactions with Isolation Forests, auto-categorize bank statements with NLP, and receive actionable savings strategies.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-8 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-all shadow-lg shadow-primary-500/25 flex items-center gap-2"
          >
            Start Managing Finances Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="px-8 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors"
          >
            Live Demo Access
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real Scikit-Learn Models
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Bank Statement CSV Upload
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Anomaly & Fraud Guard
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Role-Based Access Control
          </span>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Powered by True Machine Learning
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              No simulated data or hardcoded statistics. Built from the ground up on modern mathematical forecasting models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 hover:shadow-xl hover:border-primary-500/50 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/70 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {f.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            How It Works
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            A frictionless workflow designed to give you instant clarity over your finances.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {howItWorks.map((item, i) => (
            <div
              key={i}
              className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 relative shadow-sm"
            >
              <span className="text-4xl font-black text-primary-500/20 dark:text-primary-400/20 block mb-4">
                {item.step}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Box */}
      <section className="py-16 max-w-5xl mx-auto px-6 w-full">
        <div className="rounded-3xl bg-gradient-to-r from-primary-600 via-indigo-600 to-indigo-800 text-white p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Ready to Upgrade Your Financial Intelligence?
            </h2>
            <p className="mt-4 text-xs sm:text-sm text-primary-100 leading-relaxed">
              Join thousands who rely on AI-assisted forecasting, automated anomaly flags, and intelligent budget optimization.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/register"
                className="px-8 py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-sm font-bold transition-all shadow-lg"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800 py-10 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-slate-800 dark:text-slate-200">FinanceAI</span>
            <span>— Advanced Machine Learning Personal Finance Management</span>
          </div>
          <div>
            © {new Date().getFullYear()} FinanceAI Systems. IEEE Capstone Project Demonstration.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
