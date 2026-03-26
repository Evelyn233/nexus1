import type { PeopleNeededItem } from './profileTypes'

export const STAGE_RECOMMENDED_TAGS = ['Idea', 'Planning'] as const

export function getUserAddedStageOrder(proj: { stageOrder?: string[]; stageEnteredAt?: Record<string, number> }): string[] {
  const order = proj.stageOrder ?? []
  const entered = proj.stageEnteredAt ?? {}
  const fromEntered = Object.keys(entered)
    .filter((s) => s.trim())
    .sort((a, b) => (entered[a] ?? 0) - (entered[b] ?? 0))

  const seen = new Set<string>()
  const out: string[] = []

  for (const s of order) {
    const key = s.trim().toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      out.push(s.trim())
    }
  }

  for (const s of fromEntered) {
    const key = s.trim().toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      out.push(s.trim())
    }
  }

  if (out.length === 0 && order.length > 0) {
    return order.map((s) => s.trim()).filter(Boolean)
  }
  if (out.length === 0) {
    return []
  }

  const ideaIdx = out.findIndex((s) => s.toLowerCase() === 'idea')
  if (ideaIdx > 0) {
    const [idea] = out.splice(ideaIdx, 1)
    out.unshift(idea)
  }

  return out
}

export function inferStageFromPeopleNeeded(peopleNeeded: PeopleNeededItem[]): string {
  const text = peopleNeeded
    .map((p) => (p.text + ' ' + (p.detail ?? '')).toLowerCase())
    .join(' ')

  if (/co-founder|founding partner|cofounder|idea partner|advisor|consultant|mentor|strategist/.test(text)) {
    return 'Planning'
  }

  return 'Idea'
}

export function stageDisplayLabel(stage: string | undefined): string {
  return (stage ?? '').trim() || 'Idea'
}

