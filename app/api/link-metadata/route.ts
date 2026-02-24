import { NextRequest, NextResponse } from 'next/server'

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// 平台默认 slogan，抓取到则视为无效（标题和描述都过滤）
const GENERIC_TEXTS = [
  '3 亿人的生活经验，都在小红书',
  '3亿人的生活经验，都在小红书',
  '小红书',
  'Xiaohongshu',
  '发现美好生活',
]

function cleanTitle(title: string): string {
  const t = title
    .replace(/\s*[-|–—]\s*(小红书|Xiaohongshu)\s*$/i, '')
    .replace(/\s*[-|–—]\s*(微博|Weibo|B站|bilibili|知乎|Zhihu)\s*$/i, '')
    .trim()
  if (!t || GENERIC_TEXTS.some((g) => t === g || t.startsWith(g + ' -') || t.startsWith(g + ' |'))) return ''
  return t
}

function cleanDescription(desc: string): string | null {
  const d = desc.trim()
  if (!d || GENERIC_TEXTS.some((g) => d === g || d.startsWith(g))) return null
  return d
}

/**
 * POST: 抓取 URL 的 Open Graph 元数据，返回封面、标题、描述
 * body: { url: string }
 * 支持小红书、B站、公众号等常见链接
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const url = typeof body?.url === 'string' ? body.url.trim() : ''
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'url is required and must be http(s)' }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 400 })
    }
    const html = await res.text()
    const baseUrl = new URL(res.url || url)
    const origin = baseUrl.origin

    // 提取 og:image, og:title, og:description（支持 property 和 name，多种属性顺序）
    const extractMeta = (prop: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:)?${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:)?${prop}["']`, 'i'),
        new RegExp(`content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:)?${prop}["']`, 'i'),
      ]
      for (const re of patterns) {
        const m = html.match(re)
        if (m?.[1]) return decodeHtmlEntities(m[1].trim())
      }
      return null
    }

    let cover = extractMeta('image') || extractMeta('image:url')
    let name = extractMeta('title')
    let description = extractMeta('description')

    // 若无 og:title，用 <title>
    if (!name) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      if (titleMatch?.[1]) {
        name = cleanTitle(decodeHtmlEntities(titleMatch[1].trim()))
      }
    } else {
      name = cleanTitle(name)
    }
    if (!name?.trim()) name = null

    // 尝试从 __NEXT_DATA__ 或 window.__INITIAL_STATE__ 等提取（小红书等 SPA）
    if (!name || !description) {
      const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
      if (nextDataMatch?.[1]) {
        try {
          const data = JSON.parse(nextDataMatch[1])
          const pageProps = data?.props?.pageProps
          if (pageProps?.noteCard?.title && !name) name = pageProps.noteCard.title
          if (pageProps?.noteCard?.desc && !description) description = pageProps.noteCard.desc
          if (pageProps?.noteCard?.cover?.url && !cover) cover = pageProps.noteCard.cover.url
        } catch (_) {}
      }
      const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i)
      if (initialStateMatch?.[1] && (!name || !description)) {
        try {
          const data = JSON.parse(initialStateMatch[1])
          const note = data?.note?.noteCard || data?.noteCard
          if (note?.title && !name) name = note.title
          if (note?.desc && !description) description = note.desc
          if (note?.cover?.url && !cover) cover = note.cover.url
        } catch (_) {}
      }
    }

    // 封面 URL 转绝对路径
    if (cover && !/^https?:\/\//i.test(cover)) {
      cover = cover.startsWith('//') ? `https:${cover}` : new URL(cover, origin).href
    }

    // 过滤描述中的平台默认文案
    if (description) {
      const cleaned = cleanDescription(description)
      description = cleaned ?? null
    }

    return NextResponse.json({
      cover: cover || null,
      name: name || null,
      description: description || null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '抓取失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
