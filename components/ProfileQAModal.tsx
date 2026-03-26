'use client'

import { ArrowLeft, X, Lightbulb, Eye, EyeOff, Database, Trash2, ChevronRight, Plus } from 'lucide-react'

type QAItem = { question: string; answer: string; showInPreview?: boolean; saveToDb?: boolean }

type Props = {
  isOpen: boolean
  onClose: () => void
  sessionName?: string | null
  qaList: QAItem[]
  showAddQA: boolean
  setShowAddQA: (v: boolean) => void
  newQAQuestion: string
  setNewQAQuestion: (v: string) => void
  newQAAnswer: string
  setNewQAAnswer: (v: string) => void
  isGeneratingQA: boolean
  generatedToast: { message: string; index: number } | null
  sendingQAIndex: number | null
  onGenerateFromIdentity: () => void
  onToggleShowInPreview: (i: number) => void
  onToggleSaveToDb: (i: number) => void
  onUpdateAnswer: (i: number, answer: string) => void
  onSendAnswer: (i: number) => void
  onRemove: (i: number) => void
  onAdd: () => void
}

export function ProfileQAModal({
  isOpen,
  onClose,
  sessionName,
  qaList,
  showAddQA,
  setShowAddQA,
  newQAQuestion,
  setNewQAQuestion,
  newQAAnswer,
  setNewQAAnswer,
  isGeneratingQA,
  generatedToast,
  sendingQAIndex,
  onGenerateFromIdentity,
  onToggleShowInPreview,
  onToggleSaveToDb,
  onUpdateAnswer,
  onSendAnswer,
  onRemove,
  onAdd,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-100 shrink-0">
          <button type="button" onClick={onClose} className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 -ml-10">
            {sessionName || '我'} 感兴趣的话题 · Q&A{qaList.length > 0 ? ` (${qaList.length} 条)` : ''}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-4 pb-2 text-xs text-gray-500 border-b border-gray-100">
          不填写将不会公开展示。显示：在卡片展示；存入数据库：别人将可对此提问。
        </p>
        <div className="flex-1 overflow-y-auto p-4">
          {qaList.length === 0 && !showAddQA ? (
            <div className="py-6 flex flex-col items-center gap-3">
              <p className="text-sm text-gray-500 text-center">暂无 Q&A，可根据身份生成或手动添加</p>
              <button
                type="button"
                onClick={onGenerateFromIdentity}
                disabled={isGeneratingQA}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
              >
                <Lightbulb className="w-4 h-4" />
                {isGeneratingQA ? '生成中...' : '根据身份生成问题'}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 space-y-3">
              {qaList.map((item, i) => (
                <li key={i} className="pt-3 group flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-teal-700 flex-1 min-w-0">Q: {item.question || '(无问题)'}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleShowInPreview(i)}
                        title={item.showInPreview === true ? '在卡片显示（点击隐藏）' : '选到卡片显示'}
                        className={`p-1.5 rounded-lg transition-colors ${item.showInPreview === true ? 'text-teal-600 bg-teal-50' : 'text-gray-400 bg-gray-100'}`}
                      >
                        {item.showInPreview === true ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleSaveToDb(i)}
                        title="是否存入数据库 别人将会对此提问"
                        className={`p-1.5 rounded-lg transition-colors ${item.saveToDb === true ? 'text-teal-600 bg-teal-50' : 'text-gray-400 bg-gray-100'}`}
                      >
                        <Database className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-500">回答</label>
                    <div className="flex gap-2 items-end">
                      <textarea
                        placeholder="填写你的回答..."
                        value={item.answer}
                        onChange={(e) => onUpdateAnswer(i, e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 text-xs border border-gray-300 rounded-lg resize-none min-h-[60px] focus:ring-2 focus:ring-teal-500"
                        rows={2}
                      />
                      <button
                        type="button"
                        onClick={() => onSendAnswer(i)}
                        disabled={!item.answer?.trim() || sendingQAIndex === i}
                        title="发送并生成 tag / insight"
                        className="shrink-0 p-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {generatedToast?.index === i && (
                      <p className="text-xs text-teal-600 bg-teal-50 rounded-lg px-2.5 py-1.5">{generatedToast.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="self-end flex items-center gap-1 text-gray-400 hover:text-red-500 text-xs"
                    aria-label="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showAddQA ? (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 bg-gray-50 rounded-lg p-3">
              <input
                type="text"
                placeholder="问题"
                value={newQAQuestion}
                onChange={(e) => setNewQAQuestion(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="回答"
                value={newQAAnswer}
                onChange={(e) => setNewQAAnswer(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
              <div className="flex gap-2">
                <button type="button" onClick={onAdd} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg">保存</button>
                <button type="button" onClick={() => { setShowAddQA(false); setNewQAQuestion(''); setNewQAAnswer('') }} className="px-3 py-1.5 text-gray-600 text-sm rounded-lg">取消</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onGenerateFromIdentity}
                disabled={isGeneratingQA}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-1.5"
              >
                <Lightbulb className="w-4 h-4" />
                {isGeneratingQA ? '生成中...' : '根据身份再生成一批'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddQA(true)}
                className="w-full px-4 py-2.5 text-sm text-teal-600 hover:bg-teal-50 rounded-lg flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                添加 Q&A
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
