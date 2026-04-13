/**
 * 公开页展示用姓名：以 profileData 为准，弱化易错的 Prisma User.name（OAuth/误填常与项目名混淆）。
 */

function friendlyFromSlug(slug: string): string {
  const s = slug.trim()
  if (!s) return ''
  return s
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function listProjectTitlesLower(pd: Record<string, unknown>): string[] {
  const projects = Array.isArray(pd.projects) ? pd.projects : []
  return projects
    .map((x) => {
      const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : null
      return typeof o?.text === 'string' ? o.text.trim().toLowerCase() : ''
    })
    .filter(Boolean)
}

/** User.name 是否像项目标题或其片段，而不是人名 */
function accountNameLooksLikeProjectFragment(accountName: string, projectTitlesLower: string[]): boolean {
  const raw = accountName.trim()
  if (!raw) return true
  const lower = raw.toLowerCase()
  for (const t of projectTitlesLower) {
    if (!t) continue
    if (t === lower) return true
    if (t.includes(lower) && t.length > lower.length + 2) return true
    if (lower.includes(t) && lower.length > t.length + 2) return true
  }
  const noise = ['podcast', 'startup', 'mvp', 'saas', 'community']
  if (noise.includes(lower)) return true
  if (noise.some((w) => lower.startsWith(w + ' '))) return true
  return false
}

/** 短 headline 可当「称呼」；长句/招募语气则视为简介，不当名字 */
function headlineLooksLikeShortTitleNotBio(headline: string): boolean {
  const h = headline.trim()
  if (!h) return false
  if (h.length > 72) return false
  const lower = h.toLowerCase()
  if (
    /i am |i'm |we are |looking for|interested in|关于|正在|寻找|希望找到|create together|helps creator|meet(s)? projects/i.test(
      lower
    )
  ) {
    return false
  }
  return true
}

/**
 * 解析对外展示的「人名」。
 * 顺序：profile 显式字段 → 可信的 User.name → 短 headline → profileSlug 美化 → 创建者
 */
export function resolvePublicProfileDisplayName(params: {
  accountName: string | null | undefined
  profileData: Record<string, unknown> | null | undefined
  profileSlug: string | null | undefined
}): string {
  const pd = params.profileData && typeof params.profileData === 'object' ? params.profileData : {}
  const titles = listProjectTitlesLower(pd)
  const raw = (params.accountName || '').trim()

  const explicit =
    (typeof pd.publicDisplayName === 'string' && pd.publicDisplayName.trim()) ||
    (typeof pd.profileDisplayName === 'string' && pd.profileDisplayName.trim()) ||
    ''
  if (explicit && !accountNameLooksLikeProjectFragment(explicit, titles)) {
    return explicit.length > 80 ? `${explicit.slice(0, 80)}…` : explicit
  }

  const headline = typeof pd.headline === 'string' && pd.headline.trim() ? pd.headline.trim() : ''
  const slugFriendly = params.profileSlug ? friendlyFromSlug(params.profileSlug) : ''

  const bad = accountNameLooksLikeProjectFragment(raw, titles)
  if (!bad && raw) return raw

  // headline 常与「另一个项目的标题」相同，不能再顶替真人姓名（例如项目叫 nexus，headline 仍是 Podcast About Ai）
  if (
    headline &&
    headlineLooksLikeShortTitleNotBio(headline) &&
    !accountNameLooksLikeProjectFragment(headline, titles)
  ) {
    return headline.length > 72 ? `${headline.slice(0, 72)}…` : headline
  }

  if (slugFriendly) return slugFriendly

  return '创建者'
}
