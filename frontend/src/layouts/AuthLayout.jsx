import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Sparkles, Sun, Moon, ShieldCheck, TrendingUp, Cpu } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export const AuthLayout = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between transition-colors duration-200">
      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-6 sm:px-12 border-b border-slate-200/60 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-primary-500/25">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
            Finance<span className="text-primary-600 dark:text-primary-400">AI</span>
          </span>
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          {/* Form Outlet */}
          <div className="p-8 sm:p-12">
            <Outlet />
          </div>

          {/* Side Banner (Hidden on mobile) */}
          <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary-600 to-indigo-800 text-white relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-6 relative z-10">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md">
                Machine Learning Powered
              </span>
              <h2 className="text-2xl font-black leading-tight tracking-tight">
                Predictive Intelligence for Your Financial Future
              </h2>
              <p className="text-xs text-primary-100 leading-relaxed">
                Harness random forest regressors, isolation forest anomaly detection, and automated transaction NLP categorization.
              </p>
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                <TrendingUp className="w-5 h-5 text-indigo-200" />
                <div className="text-xs">
                  <span className="font-bold block">Next-Month Forecasting</span>
                  <span className="text-primary-200 text-[11px]">Chronological time-series expense predictions</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                <Cpu className="w-5 h-5 text-indigo-200" />
                <div className="text-xs">
                  <span className="font-bold block">NLP Categorization</span>
                  <span className="text-primary-200 text-[11px]">TF-IDF auto-tagging with feedback learning loop</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        © {new Date().getFullYear()} FinanceAI Systems. All rights reserved.
      </footer>
    </div>
  )
}

export default AuthLayout
