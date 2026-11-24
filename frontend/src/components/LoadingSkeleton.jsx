import React from 'react'

export const LoadingSkeleton = ({ count = 3, type = 'card' }) => {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl p-6 h-28"
        />
      ))}
    </div>
  )
}

export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl"
        />
      ))}
    </div>
  )
}

export default LoadingSkeleton
