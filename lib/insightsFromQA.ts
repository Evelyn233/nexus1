/**
 * 从「问题 + 回答」用 DeepSeek 提取洞察和标签，供每日一问、手动添加 Q&A 等「每次输入」时更新。
 */

export async function generateInsightsFromQA(questionText: string, answer: string | null): Promise<{ insights: string[]; tags: string[] }> {
  const apiKey = process.env.DEEPSEEK_API_KEY || ''
  if (!apiKey) return { insights: [], tags: [] }
  const text = [questionText, answer].filter(Boolean).join('\n\n').trim()
  if (!text || text.length < 10) return { insights: [], tags: [] }
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `From the Q&A below, extract ONLY two things. Use the same language as the conversation.
1. "tags": 5-10 short keyword tags (1-4 words) that describe this person. Examples: "AI founder", "Arthouse films", "Deep thinker". Output as a JSON array of strings.
2. "insights": 3-5 short insight strings (values, interests, motivations). Output as a JSON array of strings.
Return ONLY a valid JSON object with keys "tags" and "insights". No other text.`,
          },
          { role: 'user', content: `Q&A:\n\n${text}` },
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
