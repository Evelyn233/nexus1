/**
 * 将 localhost/127.0.0.1 的图片 URL 转为当前访问的 origin，
 * 解决手机端同 WiFi 访问时图片失效（手机无法解析 localhost）
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return ''
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    return url
      .replace(/^https?:\/\/localhost(:\d+)?/, origin)
      .replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/, origin)
  }
  return url
}
