/**
 * 清理展示用字符串：零宽字符、软连字符等，避免 UI 上出现「缺字母」假象。
 */
export function sanitizeBenefitTagDisplay(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
