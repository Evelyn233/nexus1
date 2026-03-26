'use client'

import { X } from 'lucide-react'

const DATABASE_SOURCE_TYPES = [
  { id: 'word', label: 'Word 文档' },
  { id: 'linkedin', label: 'LinkedIn 页面' },
  { id: 'personal_web', label: '个人网页' },
  { id: 'notion', label: 'Notion 页面' },
  { id: 'pdf', label: 'PDF 文件' },
  { id: 'google_doc', label: 'Google 文档' },
  { id: 'other', label: '其他链接' },
]

type DatabaseSource = { id: string; type: string; url: string; title?: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  databaseSources: DatabaseSource[]
  setDatabaseSources: (v: DatabaseSource[] | ((prev: DatabaseSource[]) => DatabaseSource[])) => void
  newDatabaseSourceType: string
  setNewDatabaseSourceType: (v: string) => void
  newDatabaseSourceUrl: string
  setNewDatabaseSourceUrl: (v: string) => void
  newDatabaseSourceFile: File | null
  setNewDatabaseSourceFile: (v: File | null) => void
  databaseSourceFileAdding: boolean
  setDatabaseSourceFileAdding: (v: boolean) => void
  databaseSourceFileAddResult: 'success' | 'error' | null
  setDatabaseSourceFileAddResult: (v: 'success' | 'error' | null) => void
  newDatabaseSourceText: string
  setNewDatabaseSourceText: (v: string) => void
  databaseSourceTextAdding: boolean
  setDatabaseSourceTextAdding: (v: boolean) => void
  databaseSourceTextAddResult: 'success' | 'error' | null
  setDatabaseSourceTextAddResult: (v: 'success' | 'error' | null) => void
  databaseSourceTextAddError: string
  setDatabaseSourceTextAddError: (v: string) => void
  pendingRagCount: number
  setPendingRagCount: (v: number | ((c: number) => number)) => void
  ragInitPending: boolean
  setRagInitPending: (v: boolean) => void
  ragInitMessage: string | null
  setRagInitMessage: (v: string | null) => void
  ragSyncPending: boolean
  setRagSyncPending: (v: boolean) => void
  onSaveDatabaseSources: (sources: DatabaseSource[]) => void
  onLoadUserData: () => void
  setRagStatusCheck: (v: { processedCount?: number } | null | ((prev: { processedCount?: number } | null) => { processedCount?: number } | null)) => void
}

export function ProfileDatabaseSourcesModal({
  isOpen,
  onClose,
  databaseSources,
  setDatabaseSources,
  newDatabaseSourceType,
  setNewDatabaseSourceType,
  newDatabaseSourceUrl,
  setNewDatabaseSourceUrl,
  newDatabaseSourceFile,
  setNewDatabaseSourceFile,
  databaseSourceFileAdding,
  setDatabaseSourceFileAdding,
  databaseSourceFileAddResult,
  setDatabaseSourceFileAddResult,
  newDatabaseSourceText,
  setNewDatabaseSourceText,
  databaseSourceTextAdding,
  setDatabaseSourceTextAdding,
  databaseSourceTextAddResult,
  setDatabaseSourceTextAddResult,
  databaseSourceTextAddError,
  setDatabaseSourceTextAddError,
  pendingRagCount,
  setPendingRagCount,
  ragInitPending,
  setRagInitPending,
  ragInitMessage,
  setRagInitMessage,
  ragSyncPending,
  setRagSyncPending,
  onSaveDatabaseSources,
  onLoadUserData,
  setRagStatusCheck,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <h3 className="font-semibold text-gray-900">增加数据库 / Add to database</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-4 pb-3 text-xs text-gray-500 border-b border-gray-100">
          可粘贴文本、上传 Word/PDF 文档、或添加链接；别人在「Query my database」查询时可见。
        </p>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {databaseSources.length === 0 ? (
            <p className="text-sm text-gray-500">暂无数据源，下方添加。</p>
          ) : (
            <ul className="space-y-2">
              {databaseSources.map((ds) => {
                const typeLabel = DATABASE_SOURCE_TYPES.find((t) => t.id === ds.type)?.label || ds.type
                return (
                  <li key={ds.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                    <span className="shrink-0 text-teal-600 font-medium">{typeLabel}</span>
                    {(ds.type === 'word' || ds.type === 'pdf') ? (
                      <span className="flex-1 min-w-0 truncate text-gray-700" title={ds.url}>{ds.url}</span>
                    ) : (
                      <a href={ds.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-gray-700 hover:underline" title={ds.url}>
                        {ds.url}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const next = databaseSources.filter((x) => x.id !== ds.id)
                        setDatabaseSources(next)
                        onSaveDatabaseSources(next)
                      }}
                      className="shrink-0 p-1 text-red-500 hover:bg-red-50 rounded"
                      aria-label="删除"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="pt-2 border-t border-gray-100 space-y-4">
            <div className="p-3 border-2 border-teal-200 bg-teal-50/60 rounded-lg">
              <p className="text-sm font-semibold text-teal-800 mb-1">粘贴文本添加</p>
              <p className="text-xs text-gray-600 mb-2">LinkedIn 等链接常无法抓取，请复制简介/经历粘贴到下方，点「添加文本到数据库」即可。</p>
              <textarea
                value={newDatabaseSourceText}
                onChange={(e) => setNewDatabaseSourceText(e.target.value)}
                placeholder="粘贴 LinkedIn 个人简介、经历等..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 min-h-[100px]"
                rows={4}
              />
              <button
                type="button"
                disabled={!newDatabaseSourceText.trim() || databaseSourceTextAdding}
                onClick={async () => {
                  const text = newDatabaseSourceText.trim()
                  if (!text) return
                  setDatabaseSourceTextAdding(true)
                  setDatabaseSourceTextAddResult(null)
                  setDatabaseSourceTextAddError('')
                  try {
                    const res = await fetch('/api/rag/index', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ text }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (res.ok) {
                      setNewDatabaseSourceText('')
                      setDatabaseSourceTextAddResult('success')
                      if (data?.savedToProfile && data?.ragUnavailable) {
                        setDatabaseSourceTextAddError(data?.message || '文本已保存。请先点「初始化 RAG 表」，再点「同步到 RAG」即可入库。')
                        setPendingRagCount((c) => c + 1)
                      } else {
                        setDatabaseSourceTextAddError('')
                      }
                      setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 6000)
                    } else {
                      setDatabaseSourceTextAddResult('error')
                      setDatabaseSourceTextAddError(typeof data?.error === 'string' ? data.error : '请确认 RAG 服务已启动（start-rag.bat）')
                      setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 6000)
                    }
                  } catch (err) {
                    setDatabaseSourceTextAddResult('error')
                    setDatabaseSourceTextAddError(err instanceof Error ? err.message : '请确认 RAG 服务已启动（start-rag.bat）')
                    setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 6000)
                  }
                  setDatabaseSourceTextAdding(false)
                }}
                className="mt-2 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {databaseSourceTextAdding ? '添加中...' : '添加文本到数据库'}
              </button>
              {databaseSourceTextAddResult === 'success' && (
                <p className="mt-2 text-xs text-green-600 font-medium">
                  {databaseSourceTextAddError ? databaseSourceTextAddError : '已添加到 RAG 索引，可在「Query my database」中查询。'}
                </p>
              )}
              {databaseSourceTextAddResult === 'error' && (
                <p className="mt-2 text-xs text-red-600">添加失败。{databaseSourceTextAddError || '请确认 RAG 服务已启动（start-rag.bat）。'}</p>
              )}
              {(pendingRagCount > 0 || ragInitMessage) && (
                <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200">
                  {pendingRagCount > 0 && <p className="text-xs text-amber-800 font-medium">已保存待同步：{pendingRagCount} 条</p>}
                  {ragInitMessage && (
                    <p className={`text-[11px] mt-0.5 ${ragInitMessage.includes('失败') ? 'text-red-600' : 'text-green-700'}`}>{ragInitMessage}</p>
                  )}
                  <p className="text-[11px] text-amber-700 mt-0.5">首次使用请先点「初始化 RAG 表」，再点「同步到 RAG」即可一键入库。</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={ragInitPending || ragSyncPending}
                      onClick={async () => {
                        setRagInitMessage(null)
                        setRagInitPending(true)
                        try {
                          const res = await fetch('/api/rag/init', { method: 'POST', credentials: 'include' })
                          const data = await res.json().catch(() => ({}))
                          if (res.ok && data.ok) {
                            setRagInitMessage(data.message || 'RAG 表已就绪')
                            setTimeout(() => setRagInitMessage(null), 5000)
                          } else {
                            setRagInitMessage((data.hint || data.error || '初始化失败'))
                          }
                        } catch {
                          setRagInitMessage('初始化请求失败')
                        } finally {
                          setRagInitPending(false)
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-100 border border-teal-300 rounded-lg hover:bg-teal-200 disabled:opacity-50"
                    >
                      {ragInitPending ? '初始化中...' : '初始化 RAG 表'}
                    </button>
                    <button
                      type="button"
                      disabled={ragSyncPending || ragInitPending}
                      onClick={async () => {
                        setRagSyncPending(true)
                        try {
                          const res = await fetch('/api/rag/sync-pending', { method: 'POST', credentials: 'include' })
                          const data = await res.json().catch(() => ({}))
                          if (res.ok && data.synced !== undefined) {
                            setPendingRagCount(data.remaining ?? 0)
                            onLoadUserData()
                            if (data.message) {
                              setDatabaseSourceTextAddResult('success')
                              setDatabaseSourceTextAddError(data.message)
                              setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 5000)
                            }
                            try {
                              const statusRes = await fetch('/api/rag/status', { credentials: 'include' })
                              const statusData = await statusRes.json().catch(() => ({}))
                              if (typeof statusData.processedCount === 'number') {
                                setRagStatusCheck((prev) => (prev ? { ...prev, processedCount: statusData.processedCount } : null))
                              }
                            } catch (_) {}
                          } else {
                            setDatabaseSourceTextAddResult('error')
                            setDatabaseSourceTextAddError(data?.error || data?.message || '同步失败')
                            setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 5000)
                          }
                        } catch {
                          setDatabaseSourceTextAddResult('error')
                          setDatabaseSourceTextAddError('同步请求失败')
                          setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 5000)
                        } finally {
                          setRagSyncPending(false)
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 disabled:opacity-50"
                    >
                      {ragSyncPending ? '同步中...' : '同步到 RAG'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">添加链接或文档</p>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={newDatabaseSourceType}
                  onChange={(e) => {
                    setNewDatabaseSourceType(e.target.value)
                    setNewDatabaseSourceFile(null)
                    setNewDatabaseSourceUrl('')
                    setDatabaseSourceFileAddResult(null)
                  }}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  {DATABASE_SOURCE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                {(newDatabaseSourceType === 'word' || newDatabaseSourceType === 'pdf') ? (
                  <>
                    <label className="flex-1 min-w-[180px] px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white cursor-pointer hover:bg-gray-50">
                      <span className="text-gray-600">{newDatabaseSourceFile ? newDatabaseSourceFile.name : (newDatabaseSourceType === 'word' ? '选择 Word 文档 (.docx/.doc)' : '选择 PDF 文件')}</span>
                      <input
                        type="file"
                        accept={newDatabaseSourceType === 'word' ? '.docx,.doc' : '.pdf'}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          setNewDatabaseSourceFile(f || null)
                          setDatabaseSourceFileAddResult(null)
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!newDatabaseSourceFile || databaseSourceFileAdding}
                      onClick={async () => {
                        if (!newDatabaseSourceFile) return
                        setDatabaseSourceFileAdding(true)
                        setDatabaseSourceFileAddResult(null)
                        try {
                          const form = new FormData()
                          form.append('file', newDatabaseSourceFile)
                          const res = await fetch('/api/rag/index-file', { method: 'POST', credentials: 'include', body: form })
                          if (res.ok) {
                            const next = [...databaseSources, { id: `ds-${Date.now()}-${Math.random().toString(36).slice(2)}`, type: newDatabaseSourceType, url: newDatabaseSourceFile.name, title: undefined }]
                            setDatabaseSources(next)
                            setNewDatabaseSourceFile(null)
                            setDatabaseSourceFileAddResult('success')
                            setTimeout(() => setDatabaseSourceFileAddResult(null), 4000)
                            onSaveDatabaseSources(next)
                          } else {
                            setDatabaseSourceFileAddResult('error')
                            setTimeout(() => setDatabaseSourceFileAddResult(null), 4000)
                          }
                        } catch {
                          setDatabaseSourceFileAddResult('error')
                          setTimeout(() => setDatabaseSourceFileAddResult(null), 4000)
                        }
                        setDatabaseSourceFileAdding(false)
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {databaseSourceFileAdding ? '上传中...' : '添加文档到数据库'}
                    </button>
                    {databaseSourceFileAddResult === 'success' && <p className="text-xs text-green-600 font-medium">已添加到 RAG 索引</p>}
                    {databaseSourceFileAddResult === 'error' && <p className="text-xs text-red-600">上传失败，请确认 RAG 服务已启动</p>}
                  </>
                ) : (
                  <>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newDatabaseSourceUrl}
                      onChange={(e) => setNewDatabaseSourceUrl(e.target.value)}
                      className="flex-1 min-w-[200px] px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const url = newDatabaseSourceUrl.trim()
                        if (!url) return
                        const newItem = { id: `ds-${Date.now()}-${Math.random().toString(36).slice(2)}`, type: newDatabaseSourceType, url, title: undefined }
                        const next = [...databaseSources, newItem]
                        setDatabaseSources(next)
                        setNewDatabaseSourceUrl('')
                        onSaveDatabaseSources(next)
                        try {
                          await fetch('/api/rag/index-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ url }) })
                        } catch (_) {}
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                    >
                      添加
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
