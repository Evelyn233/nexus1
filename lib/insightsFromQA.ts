/**
 * 从「问题 + 回答」或任意用户输入用 DeepSeek 提取洞察和标签，供每日一问、手动添加 Q&A、档案保存等「每次输入」时更新。
 * 规则：严格只从给定文本提取，不臆造身份或话题（如未提 AI/创业 则不得输出 AI 创始人等）。
 */

const STRICT_SYSTEM_PROMPT = `Extract ONLY from the text below. Use the same language as the text.
1. "tags": 5-10 short keyword tags (1-4 words) that describe this person **based only on what they said**. Examples: "Model", "Documentary", "Arthouse films". Do NOT add topics (e.g. AI, tech, founder, entrepreneur, philosophy) unless clearly stated in the text.
2. "insights": 3-5 short insight strings (values, interests, motivations) **strictly from the given text**. If the person says they are a model/documentary maker, insights must be about modeling, documentary, media—not technology or startup. Do not invent roles or themes not present in the text.
Return ONLY a valid JSON object with keys "tags" and "insights". No other text.`

export async function generateInsightsFromQA(questionText: string, answer: string | null): Promise<{ insights: string[]; tags: string[] }> {
  const apiKey = process.env.DEEPSEEK_API_KEY || ''
  if (!apiKey) return { insights: [], tags: [] }
  const text = [questionText, answer].filter(Boolean).join('\n\n').trim()
  if (!text || text.length < 10) return { insights: [], tags: [] }
  return generateInsightsFromText(text)
}

/** 从任意一段用户输入（简介、项目描述等）生成标签与洞察，严格基于文本内容 */
export async function generateInsightsFromText(text: string): Promise<{ insights: string[]; tags: string[] }> {
  const apiKey = process.env.DEEPSEEK_API_KEY || ''
  if (!apiKey) return { insights: [], tags: [] }
  const trimmed = (text || '').trim()
  if (trimmed.length < 10) return { insights: [], tags: [] }
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: STRICT_SYSTEM_PROMPT },
          { role: 'user', content: `Text:\n\n${trimmed}` },
        ],
        max_tokens: 600,
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return { insights: [], tags: [] }
    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content?.trim() || '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : raw
    let obj: { tags?: string | string[]; insights?: string[] }
    try {
      obj = JSON.parse(jsonStr) as { tags?: string | string[]; insights?: string[] }
    } catch {
      return { insights: [], tags: [] }
    }
    const rawTags = obj.tags
    const tags: string[] = Array.isArray(rawTags)
      ? rawTags.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
      : typeof rawTags === 'string'
        ? rawTags.split(/[,，\n]+/).map(s => s.trim()).filter(Boolean)
        : []
    const rawIns = obj.insights
    const insights = Array.isArray(rawIns)
      ? rawIns.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
      : []
    return { insights, tags }
  } catch {
    return { insights: [], tags: [] }
  }
}
