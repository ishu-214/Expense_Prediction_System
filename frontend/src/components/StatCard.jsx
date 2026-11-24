import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export const StatCard = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'positive', // 'positive' (good), 'negative' (bad), 'neutral'
  icon: Icon,
  iconColor = 'text-primary-600 bg-primary-50 dark:bg-primary-950/50 dark:text-primary-400'
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-3 rounded-xl ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {value}
        </h3>
        
        {(change !== undefined || subtitle) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {change !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold px-2 py-0.5 rounded-full ${
                  changeType === 'positive'
                    ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40'
                    : changeType === 'negative'
                    ? 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40'
                    : 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800'
                }`}
              >
                {changeType === 'positive' ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : changeType === 'negative' ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                {change}
              </span>
            )}
            {subtitle && (
              <span className="text-slate-500 dark:text-slate-400 truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
