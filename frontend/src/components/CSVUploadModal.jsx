import React, { useState } from 'react'
import { X, UploadCloud, FileText, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'
import { transactionsAPI, categoriesAPI } from '../services/api'
import { formatCurrency } from '../utils/formatters'
import { useAuth } from '../context/AuthContext'

export const CSVUploadModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { currency } = useAuth()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [categories, setCategories] = useState([])
  const [confirming, setConfirming] = useState(false)

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      if (!selected.name.endsWith('.csv')) {
        setError('Please select a valid CSV file')
        setFile(null)
        return
      }
      setFile(selected)
      setError('')
      setPreviewData(null)
    }
  }

  const handleUploadAndParse = async () => {
    if (!file) {
      setError('Please select a CSV bank statement to upload')
      return
    }

    try {
      setLoading(true)
      setError('')
      const formData = new FormData()
      formData.append('file', file)

      // Fetch categories for dropdown mapping
      const catRes = await categoriesAPI.list()
      setCategories(catRes.data)

      const res = await transactionsAPI.uploadCSV(formData)
      setPreviewData(res.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Failed to parse CSV bank statement')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (index, newCatId) => {
    const updated = [...previewData.transactions]
    updated[index].predicted_category_id = parseInt(newCatId)
    setPreviewData({ ...previewData, transactions: updated })
  }

  const handleConfirmImport = async () => {
    try {
      setConfirming(true)
      setError('')
      const payload = {
        transactions: previewData.transactions.map(t => ({
          date: t.date,
          title: t.title,
          amount: t.amount,
          transaction_type: t.transaction_type,
          category_id: t.predicted_category_id || (categories[0]?.id || 1),
          payment_method: t.payment_method || 'Bank Transfer',
          description: t.description || t.title
        }))
      }

      await transactionsAPI.confirmCSV(payload)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Failed to import transactions')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Import Bank Statement (CSV)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Securely parse, auto-categorize, and verify transactions before saving
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
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!previewData ? (
          <div className="mt-6 space-y-6">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-primary-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30">
              <input
                type="file"
                id="csvFile"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="csvFile"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {file ? file.name : 'Choose bank CSV file or drag and drop'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Supports standard bank formats (Date, Description, Amount, Type)
                </span>
              </label>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-800 dark:text-slate-200 block mb-1">
                🔒 Privacy & Security Guarantee:
              </strong>
              Your files are processed locally on your server. We never ask for bank credentials or store unverified raw financial records. Duplicate entries are automatically identified.
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadAndParse}
                disabled={!file || loading}
                className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-all shadow-md shadow-primary-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing & Categorizing...
                  </>
                ) : (
                  <>
                    Parse & Preview
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Rows detected: {previewData.total_rows}
                </span>
                {previewData.duplicates_detected > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {previewData.duplicates_detected} potential duplicates
                  </span>
                )}
              </div>
              <button
                onClick={() => setPreviewData(null)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >
                Change File
              </button>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto max-h-[380px] rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">AI Category</th>
                    <th className="py-2.5 px-3">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewData.transactions.map((tx, idx) => (
                    <tr
                      key={idx}
                      className={tx.is_duplicate ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}
                    >
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{tx.date}</td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100 max-w-[180px] truncate">
                        {tx.title}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tx.transaction_type === 'income'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(tx.amount, currency)}
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={tx.predicted_category_id || ''}
                          onChange={(e) => handleCategoryChange(idx, e.target.value)}
                          className="bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {Math.round(tx.confidence * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Verify categories above before confirming import
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={confirming}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Import ({previewData.transactions.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CSVUploadModal
