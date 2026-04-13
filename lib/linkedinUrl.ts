/** Zero-width / invisible chars sometimes break copy-paste URLs */
const INVISIBLE_RE = /[\u200B-\u200D\uFEFF]/g

export function stripLinkedInUrlNoise(raw: string): string {
  return raw.trim().replace(INVISIBLE_RE, '')
}

/**
 * Parse a LinkedIn /in/ URL and return the canonical public profile URL.
 * Always use this for <a href> so clicks open the same page as in the browser address bar.
 */
export function parseLinkedInProfileUrl(raw: string): { username: string; canonical: string } | null {
  const s = stripLinkedInUrlNoise(raw)
  const m = s.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i)
  if (!m?.[1]) return null
  const username = m[1]
  const canonical = `https://www.linkedin.com/in/${encodeURIComponent(username)}/`
  return { username, canonical }
}

/** Best-effort display name from slug (e.g. yifan-hu-0377b1249 → "Yifan Hu") */
export function displayNameGuessFromLinkedInUsername(username: string): string {
  const parts = username.split('-').filter(Boolean)
  const words: string[] = []
  for (const p of parts) {
    if (/^[a-f0-9]{7,}$/i.test(p)) break
    if (/^\d{3,}[a-f0-9-]*$/i.test(p)) break
    words.push(p.slice(0, 1).toUpperCase() + p.slice(1).toLowerCase())
  }
  return words.join(' ').trim() || username
}

export function isLinkedInProfileUrlFormat(raw: string): boolean {
  const s = stripLinkedInUrlNoise(raw)
  return /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?.*$/i.test(s)
}
