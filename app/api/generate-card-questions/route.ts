import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/generate-card-questions
 * Body: { projectSentence: string }
 * Returns English follow-ups; who + collaborators are required and fixed order.
 */

export interface CardQuestion {
  id: string
  question: string
  required: boolean
  placeholder: string
}

const FIXED: CardQuestion[] = [
  {
    id: 'who',
    question: 'What is your name?',
    required: true,
    placeholder: 'e.g. Evelyn, Alex Chen, …',
  },
  {
    id: 'collaborators',
    question: 'What kind of collaborators are you looking for?',
    required: true,
    placeholder:
      'e.g. A co-host with interview experience, a sound designer, a researcher on AI policy…',
  },
  {
    id: 'value',
    question: 'What value does this project provide (core idea or outcome)?',
    required: false,
    placeholder: 'e.g. Stories of everyday people in the AI era, actionable insights for founders…',
  },
  {
    id: 'stage',
    question: 'What stage is the project at right now?',
    required: false,
    placeholder: 'e.g. Idea, scripting, first episodes recorded, launched…',
  },
]

function coerceQuestion(x: unknown): CardQuestion | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const question = typeof o.question === 'string' ? o.question.trim() : ''
  const placeholder = typeof o.placeholder === 'string' ? o.placeholder.trim() : ''
  if (!id || !question) return null
  return {
    id,
    question,
    required: Boolean(o.required),
    placeholder: placeholder || 'Your answer…',
  }
}

function hasCjk(s: string): boolean {
  return /[\u3000-\u9fff\uac00-\ud7af]/.test(s)
}

function pickEnglishText(preferred: string, fallback: string): string {
  const t = preferred.trim()
  if (t && !hasCjk(t)) return t
  return fallback
}

/** Keep AI flavor for value/stage/extra, but enforce English + fixed order + exact collaborator prompt. */
function normalizeQuestions(raw: unknown[]): CardQuestion[] {
  const byId = new Map<string, CardQuestion>()
  for (const item of raw) {
    const q = coerceQuestion(item)
    if (q && /^[a-z_][a-z0-9_]*$/i.test(q.id)) {
      byId.set(q.id.toLowerCase(), { ...q, id: q.id.toLowerCase() })
    }
  }

  const coreIds = ['who', 'collaborators', 'value', 'stage'] as const
  const core: CardQuestion[] = coreIds.map((id) => {
    const fromAi = byId.get(id)
    const base = FIXED.find((f) => f.id === id)!
    if (id === 'who' || id === 'collaborators') {
      return {
        id,
        question: base.question,
        required: base.required,
        placeholder: pickEnglishText(fromAi?.placeholder ?? '', base.placeholder),
      }
    }
    return {
      id,
      question: pickEnglishText(fromAi?.question ?? '', base.question),
      required: false,
      placeholder: pickEnglishText(fromAi?.placeholder ?? '', base.placeholder),
    }
  })

  const extraIds = ['needs', 'blocker', 'special'] as const
  const defaultExtra: CardQuestion = {
    id: 'special',
    question: 'What makes this project stand out?',
    required: false,
    placeholder: 'e.g. A specific angle, audience, or format…',
  }
  let extra: CardQuestion | null = null
  for (const id of extraIds) {
    const q = byId.get(id)
    if (!q) continue
    const question = pickEnglishText(q.question, defaultExtra.question)
    const placeholder = pickEnglishText(q.placeholder, defaultExtra.placeholder)
    extra = { id, question, placeholder, required: false }
    break
  }

  return [...core, extra ?? defaultExtra]
}

export async function POST(req: NextRequest) {
  try {
    const key = process.env.DEEPSEEK_API_KEY?.trim()
    if (!key) {
      return NextResponse.json({ error: 'DEEPSEEK_API_KEY is not configured' }, { status: 503 })
    }

    const body = await req.json().catch(() => ({}))
    const { projectSentence } = body as { projectSentence?: string }

    if (!projectSentence || typeof projectSentence !== 'string' || !projectSentence.trim()) {
      return NextResponse.json({ error: 'projectSentence is required' }, { status: 400 })
    }

    const sentence = projectSentence.trim()

    const prompt = `You help creators clarify a project card. The user wrote (verbatim):
"""
${sentence}
"""

Return a JSON object with key "questions": an array of follow-up fields.

STRICT RULES:
1) ALL "question" and "placeholder" strings MUST be in English only. No Chinese or other languages.
2) You MUST output exactly these ids in this order as the FIRST FOUR items:
   - "who" — MUST be exactly the question: "What is your name?" (English).
   - "collaborators" — MUST be exactly the question: "What kind of collaborators are you looking for?" (this is the second most important after who).
   - "value" — core value or outcome of the project (English).
   - "stage" — current stage (English).
3) For those four, set "required": true for "who" and "collaborators" only; "required": false for "value" and "stage".
4) Add a FIFTH item with id exactly one of: "needs", "blocker", or "special" — pick the most useful for THIS project. Tailor the question to their idea. Set "required": false.
5) Placeholders must be concrete English examples inspired by their text (not generic one-liners).

Return ONLY valid JSON, no markdown. Example shape:
{"questions":[{"id":"who","question":"What is your name?","required":true,"placeholder":"..."}, ...]}`

    const model = 'deepseek-chat'
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You output ONLY valid JSON. All user-facing strings in English. Never use Chinese characters.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.55,
        max_tokens: 800,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[generate-card-questions] upstream error', res.status, text.slice(0, 300))
      return NextResponse.json(
        { error: `AI service error (${res.status}). Please try again.` },
        { status: 502 }
      )
    }

    let rawText: string
    try {
      const data = await res.json()
      rawText = data?.choices?.[0]?.message?.content ?? ''
    } catch {
      console.error('[generate-card-questions] failed to parse response body')
      return NextResponse.json(
        { error: 'Could not read AI response. Please try again.' },
        { status: 502 }
      )
    }

    const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    if (!cleaned) {
      console.error('[generate-card-questions] empty response content')
      return NextResponse.json(
        { error: 'AI returned an empty response. Please try again.' },
        { status: 502 }
      )
    }

    let parsed: { questions?: unknown[] }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('[generate-card-questions] JSON parse failed, content:', cleaned.slice(0, 200))
      return NextResponse.json(
        { error: 'AI response was malformed. Please try again.' },
        { status: 502 }
      )
    }

    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
      console.error('[generate-card-questions] no questions in parsed result')
      return NextResponse.json(
        { error: 'Could not understand AI response. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ questions: normalizeQuestions(parsed.questions) })
  } catch (e) {
    console.error('[generate-card-questions] unhandled exception:', e)
    return NextResponse.json(
      { error: 'Internal error when generating questions. Please try again.' },
      { status: 500 }
    )
  }
}
