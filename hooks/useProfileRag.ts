'use client'

import { useState, useCallback } from 'react'

export type RagResult =
  | { type: 'tag'; text: string }
  | { type: 'insight'; text: string }
  | { type: 'qa'; text: string; extra?: string }
  | { type: 'rag'; text: string; askUser?: boolean; showMessageToTa?: boolean }

type QaItem = { question: string; answer: string; saveToDb?: boolean }

type Params = {
  tags: string[]
  insights: string[]
  qaList: QaItem[]
  sessionName?: string
}

export function useProfileRag({ tags, insights, qaList, sessionName }: Params) {
  const [askMeAnythingValue, setAskMeAnythingValue] = useState('')
  const [databaseQueryResults, setDatabaseQueryResults] = useState<RagResult[] | null>(null)
  const [databaseLastQuery, setDatabaseLastQuery] = useState('')
  const [databaseQueryLoading, setDatabaseQueryLoading] = useState(false)
  const [databaseQueryRagError, setDatabaseQueryRagError] =
    useState<'unavailable' | 'empty' | null>(null)

  const handleQueryDatabaseSubmit = useCallback(async () => {
    const q = askMeAnythingValue.trim()
    if (!q) return

    const lower = q.toLowerCase()
    const results: RagResult[] = []

    // 本地 tags / insights / Q&A 命中
    tags
      .filter((t) => t.toLowerCase().includes(lower))
      .forEach((t) => results.push({ type: 'tag', text: t }))

    insights
      .filter((s) => s.toLowerCase().includes(lower))
      .forEach((s) => results.push({ type: 'insight', text: s }))

    qaList
      .filter((item) => item.saveToDb === true)
      .forEach((item) => {
        const qText = (item.question || '').toLowerCase()
        const aText = (item.answer || '').toLowerCase()
        if (qText.includes(lower) || aText.includes(lower)) {
          results.push({ type: 'qa', text: item.question || '', extra: item.answer || '—' })
        }
      })

    setDatabaseLastQuery(q)
    setAskMeAnythingValue('')
    setDatabaseQueryRagError(null)

    if (results.length > 0) {
      setDatabaseQueryResults(results)
      return
    }

    // 没有本地命中，走 /api/rag/query
    setDatabaseQueryLoading(true)
    setDatabaseQueryResults(null)
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && typeof data?.answer === 'string' && data.answer.trim()) {
        setDatabaseQueryResults([
          {
            type: 'rag',
            text: data.answer.trim(),
            askUser: !!data?.askUser,
            showMessageToTa: !!data?.showMessageToTa,
          },
        ])
        setDatabaseQueryRagError(null)
      } else {
        // 带年份时的 fallback 英文查询
        const yearMatch = q.match(/(\d{4})年?/)
        const name = typeof sessionName === 'string' ? sessionName : 'Evelyn'
        const fallbackQuery = yearMatch ? `What did ${name} do in ${yearMatch[1]}` : null

        if (res.ok && fallbackQuery) {
          try {
            const res2 = await fetch('/api/rag/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ query: fallbackQuery }),
            })
            const data2 = await res2.json().catch(() => ({}))
            if (res2.ok && typeof data2?.answer === 'string' && data2.answer.trim()) {
              setDatabaseQueryResults([
                {
                  type: 'rag',
                  text: data2.answer.trim(),
                  askUser: !!data2?.askUser,
                  showMessageToTa: !!data2?.showMessageToTa,
                },
              ])
              setDatabaseQueryRagError(null)
            } else {
              setDatabaseQueryResults([])
              setDatabaseQueryRagError('empty')
            }
          } catch {
            setDatabaseQueryResults([])
            setDatabaseQueryRagError('empty')
          }
        } else {
          setDatabaseQueryResults([])
          setDatabaseQueryRagError(res.status === 503 ? 'unavailable' : 'empty')
        }
      }
    } catch {
      setDatabaseQueryResults([])
      setDatabaseQueryRagError('unavailable')
    } finally {
      setDatabaseQueryLoading(false)
    }
  }, [askMeAnythingValue, tags, insights, qaList, sessionName])

  return {
    askMeAnythingValue,
    setAskMeAnythingValue,
    databaseQueryResults,
    setDatabaseQueryResults,
    databaseLastQuery,
    setDatabaseLastQuery,
    databaseQueryLoading,
    databaseQueryRagError,
    handleQueryDatabaseSubmit,
  }
}

