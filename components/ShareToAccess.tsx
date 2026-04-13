'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ExternalLink, Share2, AlertCircle, Loader2, X, Twitter, Instagram } from 'lucide-react'

interface ShareToAccessProps {
  isOpen: boolean
  onClose: () => void
  onVerified: () => void
  projectSentence: string
  cardData: any
}

type Platform = 'twitter' | 'xiaohongshu'

export default function ShareToAccess({ isOpen, onClose, onVerified, projectSentence, cardData }: ShareToAccessProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  // 构建分享文本
  const shareText = `I'm building: ${projectSentence || 'something exciting'} — Join me on Nexus! 🚀`

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedPlatform(null)
      setShareUrl('')
      setUrlError('')
      setIsVerified(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform)
    setUrlError('')
    setIsVerified(false)

    // 生成预设的分享链接
    const encodedText = encodeURIComponent(shareText)
    let shareLink = ''

    if (platform === 'twitter') {
      // Twitter/X share URL
      shareLink = `https://twitter.com/intent/tweet?text=${encodedText}`
    } else if (platform === 'xiaohongshu') {
      // 小红书没有官方分享链接生成器，通常用户会手动分享
      // 这里提供一个空的行为提示
      shareLink = ''
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'noopener,noreferrer')
    }
  }

  const handleVerify = async () => {
    if (!shareUrl.trim()) {
      setUrlError('Please paste your share link')
      return
    }

    if (!validateUrl(shareUrl)) {
      setUrlError('Please enter a valid URL')
      return
    }

    setIsVerifying(true)
    setUrlError('')

    // 模拟验证延迟（实际项目中可以调用API验证链接）
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 简单验证：检查URL格式和域名
    try {
      const url = new URL(shareUrl)
      const validDomains = [
        'twitter.com',
        'x.com',
        'www.xiaohongshu.com',
        'xiaohongshu.com',
        'xhslink.com'
      ]

      const isValid = validDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith('.' + domain)
      )

      if (isValid) {
        setIsVerified(true)
        setIsVerifying(false)
      } else {
        setUrlError('Please share on Twitter (X) or 小红书 and paste that link here')
        setIsVerifying(false)
      }
    } catch {
      setUrlError('Invalid URL format')
      setIsVerifying(false)
    }
  }

  const handleContinue = () => {
    if (isVerified) {
      onVerified()
    }
  }

  const handleSkip = () => {
    // 用户选择跳过，直接进入项目
    onVerified()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Share to Access</h2>
              <p className="text-sm text-gray-400">Your full project page awaits!</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Project Preview */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Your project</p>
            <p className="text-sm text-teal-300 font-medium leading-relaxed">"{projectSentence}"</p>
          </div>

          {/* Share Text Preview */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
              Share this message
            </label>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-sm text-gray-200 leading-relaxed">{shareText}</p>
            </div>
          </div>

          {/* Platform Selection */}
          {!selectedPlatform && (
            <div className="space-y-3">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Choose a platform to share
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Twitter/X */}
                <button
                  onClick={() => handlePlatformSelect('twitter')}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-[#1DA1F2]/10 border-2 border-[#1DA1F2]/30 hover:border-[#1DA1F2]/60 hover:bg-[#1DA1F2]/20 transition-all group"
                >
                  <div className="w-14 h-14 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Twitter className="w-7 h-7 text-[#1DA1F2]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">Twitter / X</p>
                    <p className="text-xs text-gray-400 mt-0.5">Share and get link</p>
                  </div>
                </button>

                {/* 小红书 */}
                <button
                  onClick={() => handlePlatformSelect('xiaohongshu')}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-red-500/10 border-2 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/20 transition-all group"
                >
                  <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Instagram className="w-7 h-7 text-red-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">小红书</p>
                    <p className="text-xs text-gray-400 mt-0.5">分享到小红书</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Link Verification */}
          {selectedPlatform && !isVerified && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400" />
                  <span className="text-sm text-teal-300 font-medium">
                    {selectedPlatform === 'twitter' ? 'Twitter / X' : '小红书'} selected
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedPlatform(null)
                    setShareUrl('')
                    setUrlError('')
                  }}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Change
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-amber-200 font-medium mb-1">
                      {selectedPlatform === 'twitter' 
                        ? 'How to get your share link:' 
                        : '如何获取分享链接：'}
                    </p>
                    <ol className="text-amber-200/80 text-xs space-y-1 list-decimal list-inside">
                      {selectedPlatform === 'twitter' ? (
                        <>
                          <li>Click the Twitter button above to open composer</li>
                          <li>Post your message</li>
                          <li>Copy the tweet URL and paste below</li>
                        </>
                      ) : (
                        <>
                          <li>打开小红书App</li>
                          <li>发布你的内容</li>
                          <li>复制笔记链接粘贴到下方</li>
                        </>
                      )}
                    </ol>
                  </div>
                </div>
              </div>

              {/* URL Input */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
                  Paste your share link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={shareUrl}
                    onChange={(e) => {
                      setShareUrl(e.target.value)
                      setUrlError('')
                    }}
                    placeholder={
                      selectedPlatform === 'twitter'
                        ? 'https://twitter.com/yourname/status/...'
                        : 'https://www.xiaohongshu.com/explore/...'
                    }
                    className={`flex-1 px-4 py-3 bg-gray-800/50 border ${
                      urlError ? 'border-red-500' : 'border-gray-700'
                    } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm`}
                  />
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying || !shareUrl.trim()}
                    className="px-5 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {isVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Verify
                      </>
                    )}
                  </button>
                </div>
                {urlError && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {urlError}
                  </p>
                )}
              </div>

              {/* Open Platform Link */}
              {selectedPlatform === 'twitter' && (
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  <Twitter className="w-4 h-4" />
                  Share on Twitter / X
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              )}
            </div>
          )}

          {/* Verified State */}
          {isVerified && (
            <div className="space-y-4">
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl p-5 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-bold text-teal-300 mb-1">Verified!</p>
                <p className="text-sm text-gray-400">
                  {selectedPlatform === 'twitter' ? 'Your tweet has been verified.' : '分享链接已验证通过'}
                </p>
              </div>

              <button
                onClick={handleContinue}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-violet-900/30"
              >
                Enter Full Project Page
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Skip Option */}
          {!isVerified && (
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={handleSkip}
                className="w-full py-2.5 text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                Skip for now — enter project directly
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
