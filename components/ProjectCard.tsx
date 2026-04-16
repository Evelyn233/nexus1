'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Download, Copy, Check, ArrowRight, Sparkles, Heart, Bookmark, MessageCircle, Share2 } from 'lucide-react'

/** 卡片数据 */
export interface CardData {
  hook: string
  who?: string
  collaborators?: string
  value?: string
  stage?: string
  needs?: string
  blocker?: string
  special?: string
  projectUrl?: string
  attachmentUrl?: string
  attachmentCaption?: string
  /** 与 attachmentUrl 按行对齐：外链附件的原始页面 URL（用于打开链接、创建项目时存真实链接） */
  attachmentLinkHref?: string
  /** 与 attachmentUrl 按行对齐：抓取到的标题（无则空行） */
  attachmentLinkTitle?: string
}

interface ProjectCardProps {
  data: CardData
  /** 预览模式下隐藏"下载"按钮等交互元素 */
  previewMode?: boolean
  /** ref 用于 html2canvas 截图 */
  innerRef?: React.RefObject<HTMLDivElement>
  /**
   * 草稿卡片：在「Find collaborators on Nexus」同一行展示点赞/收藏/评论/Engage，
   * 点击后跳转创建正式项目（由父组件传入 onAction）。
   */
  draftEngagement?: { onAction: () => void }
}

export default function ProjectCard({ data, previewMode = false, innerRef, draftEngagement }: ProjectCardProps) {
  const {
    hook,
    who,
    collaborators,
    value,
    stage,
    needs,
    blocker,
    special,
    projectUrl,
    attachmentUrl,
    attachmentCaption,
    attachmentLinkHref,
    attachmentLinkTitle,
  } = data

  /** 去掉 URL 中的协议头，用于显示 */
  const displayUrl = projectUrl
    ? projectUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null

  /** 去掉 Nexus 前缀的短版 */
  const shortUrl = displayUrl
    ? displayUrl.replace(/^www\./, '').replace(/^nexus\./, '')
    : null

  /** 从 hook 提取 1-2 个标签 */
  const autoTags: string[] = []
  const hookLower = hook.toLowerCase()
  const tagMap: [string, string][] = [
    ['ai', 'AI'], ['ml', 'ML'], ['llm', 'LLM'], ['gpt', 'AI'],
    ['web3', 'Web3'], ['crypto', 'Crypto'],
    ['fintech', 'FinTech'], ['finance', 'Finance'],
    ['edtech', 'EdTech'], ['education', 'Edu'],
    ['health', 'Health'], ['bio', 'Bio'],
    ['community', 'Community'], ['social', 'Social'],
    ['saas', 'SaaS'], ['b2b', 'B2B'], ['b2c', 'B2C'],
    ['mobile', 'Mobile'], ['app', 'App'], ['web', 'Web'],
    ['design', 'Design'], ['product', 'Product'], ['growth', 'Growth'],
    ['open source', 'OSS'], ['opensource', 'OSS'],
    ['api', 'API'], ['dev', 'Dev'],
  ]
  for (const [kw, tag] of tagMap) {
    if (hookLower.includes(kw) && !autoTags.includes(tag)) {
      autoTags.push(tag)
    }
  }
  const displayTags = autoTags.slice(0, 4)

  const filledOptionals = [collaborators, value, stage, needs, blocker, special].filter(Boolean)

  /** 多附件：url 与 caption 按行对齐（仅统计有 url 的条目） */
  const attachmentUrls = (attachmentUrl || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const captionLines = (attachmentCaption || '').split('\n')
  while (captionLines.length < attachmentUrls.length) captionLines.push('')
  const linkHrefLines = (attachmentLinkHref || '').split('\n')
  const linkTitleLines = (attachmentLinkTitle || '').split('\n')
  while (linkHrefLines.length < attachmentUrls.length) linkHrefLines.push('')
  while (linkTitleLines.length < attachmentUrls.length) linkTitleLines.push('')
  const hasAttachment = attachmentUrls.length > 0

  return (
    <div
      ref={innerRef}
      className={`relative select-none ${hasAttachment ? 'overflow-visible' : 'overflow-hidden'}`}
      style={{
        width: '100%',
        ...(hasAttachment
          ? { height: 'auto', minHeight: 0 }
          : { aspectRatio: '1 / 1' }),
        backgroundColor: '#ffffff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* 顶部背景装饰 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '48%',
          background: 'linear-gradient(160deg, #f0fdfb 0%, #faf5ff 55%, #ffffff 100%)',
          zIndex: 0,
        }}
      />
      {/* 右上角光斑 */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          right: '-60px',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      {/* 左下角光斑 */}
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-40px',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,212,191,0.14) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <div
        className="relative z-10 flex flex-col"
        style={{ width: '100%', height: '100%', padding: '48px 52px' }}
      >
        {/* 顶部：品牌 + 标签（与站点其它页一致使用 public/logo-nexus.jpeg） */}
        <div className="flex items-center justify-between mb-6">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: '32px',
            }}
          >
            <img
              src="/logo-nexus.jpeg"
              alt="Nexus"
              style={{
                height: '32px',
                width: 'auto',
                maxWidth: '160px',
                objectFit: 'contain',
                objectPosition: 'left center',
                display: 'block',
              }}
            />
          </div>

          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end max-w-[60%]">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '100px',
                    backgroundColor: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    color: '#7c3aed',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.2px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hook 区 */}
        <div className="mb-5">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '100px',
              backgroundColor: '#0d9488',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            <Sparkles style={{ width: '12px', height: '12px' }} />
            I&apos;m building
          </div>
          <h1
            style={{
              fontSize: 'clamp(22px, 3vw, 30px)',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
              margin: 0,
            }}
          >
            {hook}
          </h1>
        </div>

        {/* 中部信息区：无附件时 flex-1 撑满方形卡片；有附件时随内容增高避免裁切 */}
        <div
          className={hasAttachment ? '' : 'flex-1'}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {who && <InfoRow icon="👤" label="Name" value={who} accentColor="#7c3aed" />}
          {collaborators && (
            <InfoRow icon="🤝" label="Collaborators" value={collaborators} accentColor="#6366f1" />
          )}
          {value && <InfoRow icon="💡" label="Value" value={value} accentColor="#0891b2" />}
          {stage && <InfoRow icon="📍" label="Stage" value={stage} accentColor="#0d9488" />}
          {needs && <InfoRow icon="📣" label="Need most" value={needs} accentColor="#ea580c" />}
          {blocker && <InfoRow icon="🚧" label="Blocker" value={blocker} accentColor="#dc2626" />}
          {special && <InfoRow icon="⭐" label="Standout" value={special} accentColor="#ca8a04" />}
        </div>

        {/* 附件图片区：多个附件并排显示 */}
        {attachmentUrls.map((url, i) => (
          <AttachmentBlock
            key={`${url.slice(0, 48)}-${i}`}
            url={url}
            caption={captionLines[i]?.trim() || undefined}
            pageHref={linkHrefLines[i]?.trim() || undefined}
            linkTitle={linkTitleLines[i]?.trim() || undefined}
            compact
          />
        ))}

        {/* 底部 CTA：有项目链接时保持原样；无链接时 Linktree 式按钮直达首页 */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '20px',
            borderTop: '1.5px solid #f1f5f9',
          }}
        >
          {shortUrl ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    fontWeight: 500,
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Join / follow
                </p>
                <p
                  style={{
                    fontSize: '15px',
                    color: '#0d9488',
                    fontWeight: 700,
                    margin: '2px 0 0',
                    letterSpacing: '-0.2px',
                  }}
                >
                  {shortUrl}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShareButtons projectUrl={projectUrl!} hook={hook} />
                <div
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.2px',
                  }}
                >
                  Join →
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
              }}
            >
              <Link
                href="/"
                className="flex-1 min-w-[min(100%,200px)] text-center py-3.5 px-4 rounded-[14px] bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold text-sm shadow-[0_2px_8px_rgba(13,148,136,0.35)] active:scale-[0.98] transition-all duration-200 no-underline inline-flex items-center justify-center"
              >
                Find collaborators on Nexus →
              </Link>
              {draftEngagement && (
                <div className="flex items-center gap-1.5 flex-wrap shrink-0 justify-center max-sm:w-full sm:ml-auto sm:justify-end">
                  <button
                    type="button"
                    title="创建正式项目后即可点赞"
                    onClick={draftEngagement.onAction}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    0
                  </button>
                  <button
                    type="button"
                    title="创建正式项目后即可收藏"
                    onClick={draftEngagement.onAction}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Save
                  </button>
                  <button
                    type="button"
                    title="创建正式项目后即可评论"
                    onClick={draftEngagement.onAction}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    0
                  </button>
                  <button
                    type="button"
                    onClick={draftEngagement.onAction}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 shadow-sm"
                  >
                    Engage
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 卡片左下角小三角装饰 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 0,
          height: 0,
          borderLeftWidth: '36px',
          borderLeftColor: 'transparent',
          borderBottomWidth: '36px',
          borderBottomColor: '#e0e7ff',
          borderStyle: 'solid',
          zIndex: 1,
        }}
      />
    </div>
  )
}

/** 单行信息行 */
function InfoRow({
  icon,
  label,
  value,
  accentColor = '#7c3aed',
}: {
  icon: string
  label: string
  value: string
  accentColor?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '10px',
        backgroundColor: 'rgba(255,255,255,0.85)',
        border: '1px solid #f1f5f9',
        backdropFilter: 'blur(4px)',
      }}
    >
      <span style={{ fontSize: '14px', lineHeight: '20px', flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: accentColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '1px',
          }}
        >
          {label}
        </span>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#1e293b',
            margin: 0,
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

/** 附件：description 在上，picture/link 在下，垂直排列
 *  每个 picture/link 是独立的可点击元素
 */
function AttachmentBlock({
  url,
  caption,
  pageHref,
  linkTitle,
  compact = false,
}: {
  url: string
  caption?: string
  pageHref?: string
  linkTitle?: string
  compact?: boolean
}) {
  const cap = caption?.trim()
  const href = pageHref?.trim()
  const title = linkTitle?.trim()

  if (!href && !url) return null

  const isImageUrl = !!url && !url.startsWith('data:')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, gap: '6px' }}>
      {/* Describe 说明 */}
      {cap && (
        <div
          style={{
            padding: '6px 10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: compact ? '11px' : '12px',
            color: '#64748b',
            fontWeight: 500,
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {cap}
        </div>
      )}

      {/* 图片/链接：独立可点击 */}
      {href && isImageUrl ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            borderRadius: '10px',
            border: '1.5px solid #e2e8f0',
            overflow: 'hidden',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.borderColor = '#0d9488'
            el.style.boxShadow = '0 4px 12px rgba(13,148,136,0.15)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.borderColor = '#e2e8f0'
            el.style.boxShadow = 'none'
          }}
        >
          <img
            src={url}
            alt={title || ''}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement
              img.style.display = 'none'
              img.parentElement!.style.backgroundColor = '#f1f5f9'
              img.parentElement!.style.minHeight = '80px'
            }}
          />
          {title && (
            <div style={{ padding: '6px 10px', backgroundColor: '#fff' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{title}</span>
            </div>
          )}
        </a>
      ) : href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: compact ? '8px 10px' : '10px 14px',
            borderRadius: '10px',
            border: '1.5px solid #e2e8f0',
            backgroundColor: '#ffffff',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.borderColor = '#0d9488'
            el.style.boxShadow = '0 4px 12px rgba(13,148,136,0.15)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.borderColor = '#e2e8f0'
            el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span style={{ flex: 1, fontSize: compact ? '11px' : '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title || href.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </a>
      ) : url ? (
        <img
          src={url}
          alt={caption || 'Attachment'}
          style={{
            width: '100%',
            borderRadius: '10px',
            border: '1.5px solid #e2e8f0',
          }}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement
            img.style.display = 'none'
          }}
        />
      ) : null}
    </div>
  )
}

// ─── 分享按钮组件 ───────────────────────────────────────────────

interface ShareButtonsProps {
  projectUrl: string
  hook: string
}

function ShareButtons({ projectUrl, hook }: ShareButtonsProps) {
  const [showMenu, setShowMenu] = useState(false)

  const encodeText = encodeURIComponent(`🚀 ${hook}\n\n🔗 ${projectUrl}\n\n#Nexus #Collaborate`)
  const encodeUrl = encodeURIComponent(projectUrl)

  const shareLinks = [
    {
      name: 'Twitter',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodeText}`,
      color: '#000',
    },
    {
      name: 'LinkedIn',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeUrl}`,
      color: '#0A66C2',
    },
    {
      name: 'Facebook',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeUrl}`,
      color: '#1877F2',
    },
    {
      name: 'Copy Link',
      icon: <Copy className="w-4 h-4" />,
      href: null,
      color: '#64748b',
      action: () => {
        navigator.clipboard.writeText(projectUrl)
      },
    },
  ]

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm transition-colors"
        title="Share"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {showMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
            }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: '8px',
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              zIndex: 50,
              minWidth: '160px',
            }}
          >
            {shareLinks.map((item) => (
              <a
                key={item.name}
                href={item.href || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (item.action) {
                    e.preventDefault()
                    item.action()
                    setShowMenu(false)
                  } else {
                    setShowMenu(false)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  color: item.color,
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                {item.name}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── 交互层（仅在 previewMode=false 时显示）────────────────────────────

interface CardActionsProps {
  cardData: CardData
  previewRef: React.RefObject<HTMLDivElement | null>
}

export function CardActions({ cardData, previewRef }: CardActionsProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const copyText = () => {
    const lines = [`I'm building: ${cardData.hook}`]
    if (cardData.who) lines.push(`Name: ${cardData.who}`)
    if (cardData.collaborators) lines.push(`Collaborators: ${cardData.collaborators}`)
    if (cardData.value) lines.push(`Value: ${cardData.value}`)
    if (cardData.stage) lines.push(`Stage: ${cardData.stage}`)
    if (cardData.needs) lines.push(`Need most: ${cardData.needs}`)
    if (cardData.projectUrl) lines.push(`Link: ${cardData.projectUrl}`)
    lines.push('', `Find collaborators on @NexusApp → ${cardData.projectUrl || 'nexus.app'}`)
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const downloadPng = async () => {
    const ref = previewRef?.current
    if (!ref) return

    setDownloading(true)
    try {
      // Wait for all images inside the card to finish loading before screenshotting
      const imgs = ref.querySelectorAll('img')
      await Promise.all(
        Array.from(imgs).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) resolve()
              else img.addEventListener('load', () => resolve(), { once: true })
              img.addEventListener('error', () => resolve(), { once: true })
            })
        )
      )

      // Small delay to let any lazy-rendered content finish painting
      await new Promise((r) => setTimeout(r, 100))

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(ref, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `nexus-project-card-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('[card] download failed:', err)
      alert('Download failed — try right-clicking the card to save.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* 下载 PNG */}
      <button
        onClick={() => void downloadPng()}
        disabled={downloading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm disabled:opacity-50 transition-colors"
      >
        {downloading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {downloading ? 'Working…' : 'Download PNG'}
      </button>

      {/* 复制文案 */}
      <button
        onClick={copyText}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-green-600">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy text
          </>
        )}
      </button>
    </div>
  )
}
