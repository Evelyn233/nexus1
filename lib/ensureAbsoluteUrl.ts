/**
 * 确保外链带协议，避免被当作相对路径变成 localhost/xxx
 * 例如 www.linkedin.com/in/xxx → https://www.linkedin.com/in/xxx
 */
export function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return ''
  const u = url.trim()
  if (!u) return ''
  if (u.toLowerCase().startsWith('http://') || u.toLowerCase().startsWith('https://')) return u
  const withoutLeadingSlash = u.replace(/^\/+/, '')
  return withoutLeadingSlash ? `https://${withoutLeadingSlash}` : u
}
