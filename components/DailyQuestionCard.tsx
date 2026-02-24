'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, ChevronDown, ChevronUp, Send, X } from 'lucide-react'
import { RATING_OPTIONS, type QuestionRating } from '@/lib/dailyQuestion'

type DailyQuestionState = {
  questionText: string
  questionDate: string
  respondedCountToday: number
  lastResponse: {
    answer: string | null
    rating: string
    ratingNote: string | null
    createdAt: string
  } | null
} | null

const POPUP_DISMISS_KEY = 'daily-question-popup-dismissed'

export default function DailyQuestionCard() {
  const [data, setData] = useState<DailyQuestionState>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [showPopup, setShowPopup] = useState(false)
  const [answer, setAnswer] = useState('')
  const [rating, setRating] = useState<QuestionRating | ''>('')
  const [ratingNote, setRatingNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [customQuestionInput, setCustomQuestionInput] = useState('')
  const [activeCustomQuestion, setActiveCustomQuestion] = useState<string | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)

  const fetchDaily = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/daily-question')
      if (!res.ok) throw new Error('获取失败')
      const json = await res.json()
      setData(json)
      setAnswer('')
      setRating('')
      setRatingNote('')
      setActiveCustomQuestion(null)
      setShowCustomInput(false)
      if (json.respondedCountToday === 0) {
        try {
          const last = localStorage.getItem(POPUP_DISMISS_KEY)
          const today = new Date().toDateString()
          if (last !== today) setShowPopup(true)
        } catch {
          setShowPopup(true)
        }
      }
    } catch (e) {
      setError('加载今日问题失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDaily()
  }, [])

  const closePopup = () => {
    setShowPopup(false)
    try {
      localStorage.setItem(POPUP_DISMISS_KEY, new Date().toDateString())
    } catch {}
  }

  const handleSubmit = async () => {
    if (rating === 'other' && !ratingNote.trim()) {
      setError('选择「其他」时请填写你希望的问题方向，将用于生成下一题')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/daily-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: (activeCustomQuestion ?? data?.questionText) || undefined,
          answer: answer.trim() || undefined,
          rating: rating || 'keep',
          ratingNote: ratingNote.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '提交失败')
      await fetchDaily()
      // 通知 profile 页刷新，并带上刚答的 Q&A 做乐观更新
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('daily-question:submitted', {
          detail: {
            question: (activeCustomQuestion ?? data?.questionText)?.trim() || '',
            answer: answer.trim() || '',
          },
        }))
      }
      const insightCount = Array.isArray(json.insights) ? json.insights.length : 0
      const tagCount = Array.isArray(json.tags) ? json.tags.length : 0
      if (json.savedToProfile === true) {
        const tips: string[] = ['这个问题已加入感兴趣的话题']
        if (insightCount > 0) tips.push(`已生成 ${insightCount} 条洞察`)
        if (tagCount > 0) tips.push(`已生成 ${tagCount} 个标签`)
        setSuccessMessage(tips.join('；') + '。您可在 profile 中选择是否在卡片上显示、是否存入数据库。')
      } else {
        setSuccessMessage('已记录评价，未放进感兴趣的话题（填写回答后再提交可写入）')
      }
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 animate-pulse">
          <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-full bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  // 加载失败或接口异常时显示重试卡片，不直接隐藏每日一问
  if (!data && !loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <p className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
            <MessageCircle className="w-5 h-5 text-amber-500" />
            每日一问
          </p>
          <p className="text-sm text-gray-600 mb-3">今日问题加载失败，可能是网络或服务暂时不可用。</p>
          <button
            type="button"
            onClick={() => fetchDaily()}
            className="px-3 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="max-w-md mx-auto px-4 py-2">
      {/* 卡片最上面的弹窗：今日一问，点击「开始回答」关闭 */}
      {showPopup && data.questionText && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20%] px-4 bg-black/40"
          onClick={closePopup}
          role="dialog"
          aria-label="今日一问"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePopup}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-2">今日一问</p>
            <p className="text-lg text-gray-800 leading-relaxed pr-8">{data.questionText}</p>
            <p className="mt-4 text-sm text-gray-500">多维问题，与你的经历和思考相关。回答可选，记得评价问题风格～</p>
            <button
              type="button"
              onClick={closePopup}
              className="mt-5 w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
            >
              开始回答
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <MessageCircle className="w-5 h-5 text-amber-500" />
            每日一问
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {data.respondedCountToday > 0 && (
              <p className="pt-3 text-sm font-medium text-amber-600">已答 {data.respondedCountToday} 题，继续生成问题并回答</p>
            )}
            <p className="pt-3 text-gray-700 leading-relaxed">{activeCustomQuestion ?? data.questionText}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fetchDaily()}
                disabled={loading}
                className="text-sm text-amber-600 hover:text-amber-700 hover:underline disabled:opacity-50"
              >
                换一个问题
              </button>
              <button
                type="button"
                onClick={() => setShowCustomInput((v) => !v)}
                className="text-sm text-amber-600 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-50"
              >
                自拟问题
              </button>
            </div>
            {showCustomInput && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="输入一个你自己想回答的问题"
                  value={customQuestionInput}
                  onChange={(e) => setCustomQuestionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customQuestionInput.trim()) {
                      setActiveCustomQuestion(customQuestionInput.trim())
                      setCustomQuestionInput('')
                      setShowCustomInput(false)
                    }
                  }}
                  className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                  maxLength={300}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customQuestionInput.trim()) {
                      setActiveCustomQuestion(customQuestionInput.trim())
                      setCustomQuestionInput('')
                      setShowCustomInput(false)
                    }
                  }}
                  disabled={!customQuestionInput.trim()}
                  className="shrink-0 px-3 py-2 text-sm text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  确定
                </button>
              </div>
            )}

            <>
                <textarea
                  placeholder="写下你的回答（可选）"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="mt-3 w-full min-h-[88px] px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none"
                  maxLength={2000}
                />
                <p className="mt-2 text-xs text-gray-500">你觉得下次的问题应该：（可选）</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRating(opt.value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        rating === opt.value
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {rating === 'other' && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">你希望下次问题的方向（与你的 profile 相关，会用于生成明日问题）：</label>
                    <input
                      type="text"
                      placeholder="例如：更偏技术、更生活化、更关于创业、更关于艺术…"
                      value={ratingNote}
                      onChange={(e) => setRatingNote(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                      maxLength={200}
                    />
                    <p className="mt-1 text-[11px] text-gray-500">此内容会留存并影响明日问题方向</p>
                  </div>
                )}
                {error && (
                  <p className="mt-2 text-sm text-red-500">{error}</p>
                )}
                {successMessage && (
                  <p className="mt-2 text-sm text-green-600">{successMessage}</p>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {submitting ? (answer.trim() ? '正在生成洞察和标签…' : '提交中…') : '提交'}
                  <Send className="w-4 h-4" />
                </button>
              </>
          </div>
        )}
      </div>
    </div>
  )
}
