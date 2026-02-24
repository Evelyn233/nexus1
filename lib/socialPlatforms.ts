/**
 * Add social icon 列表：平台 key、label、Lucide 图标、URL 占位符。
 * 与参考图一致：图标 + 名称 + >，可搜索、可滚动。
 */
import type { LucideIcon } from 'lucide-react'
import {
  AtSign,
  BookOpen,
  Camera,
  Cloud,
  DollarSign,
  Globe,
  Heart,
  Image,
  Instagram,
  Mail,
  MessageCircle,
  Mic,
  Music,
  Phone,
  Play,
  Send,
  ShoppingBag,
  Smartphone,
  Square,
  Star,
  Video,
} from 'lucide-react'

export type SocialCategory = 'suggested' | 'social' | 'media' | 'contact' | 'make_money' | 'events' | 'text'

export interface SocialPlatform {
  key: string
  label: string
  Icon: LucideIcon
  placeholder?: string
  /** 用图片替代 Icon，如 Red Note 小红书 */
  iconImage?: string
  category?: SocialCategory
  description?: string
}

export const ALL_SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: 'threads', label: 'Threads', Icon: AtSign, placeholder: 'https://threads.net/@username', category: 'social', description: 'Share your Threads.' },
  { key: 'instagram', label: 'Instagram', Icon: Instagram, placeholder: 'https://instagram.com/username', category: 'social', description: 'Display your posts and reels.' },
  { key: 'email', label: 'Email', Icon: Mail, placeholder: 'mailto:you@example.com', category: 'contact', description: 'Share your email.' },
  { key: 'facebook', label: 'Facebook', Icon: MessageCircle, placeholder: 'https://facebook.com/username', category: 'social', description: 'Connect on Facebook.' },
  { key: 'youtube', label: 'YouTube', Icon: Play, placeholder: 'https://youtube.com/@channel', category: 'media', description: 'Share YouTube videos on your profile.' },
  { key: 'x', label: 'X', Icon: AtSign, placeholder: 'https://x.com/username', category: 'social', description: 'Share your X profile.' },
  { key: 'tiktok', label: 'TikTok', Icon: Music, placeholder: 'https://tiktok.com/@username', category: 'social', description: 'Share your TikToks on your profile.' },
  { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, placeholder: 'https://wa.me/1234567890', category: 'contact', description: 'Chat on WhatsApp.' },
  { key: 'whatsapp_channel', label: 'WhatsApp Channel', Icon: MessageCircle, placeholder: 'https://whatsapp.com/channel/...', category: 'contact' },
  { key: 'snapchat', label: 'Snapchat', Icon: Camera, placeholder: 'https://snapchat.com/add/username', category: 'social' },
  { key: 'airchat', label: 'Airchat', Icon: MessageCircle, placeholder: 'https://airchat.com/...', category: 'social' },
  { key: 'amazon', label: 'Amazon', Icon: ShoppingBag, placeholder: 'https://amazon.com/...', category: 'make_money' },
  { key: 'android_play_store', label: 'Android Play Store', Icon: Play, placeholder: 'https://play.google.com/store/...', category: 'media' },
  { key: 'apple_app_store', label: 'Apple App Store', Icon: Smartphone, placeholder: 'https://apps.apple.com/...', category: 'media' },
  { key: 'apple_music', label: 'Apple Music', Icon: Music, placeholder: 'https://music.apple.com/...', category: 'media' },
  { key: 'apple_podcast', label: 'Apple Podcast', Icon: Mic, placeholder: 'https://podcasts.apple.com/...', category: 'media' },
  { key: 'bandcamp', label: 'Bandcamp', Icon: Music, placeholder: 'https://bandcamp.com/...', category: 'media' },
  { key: 'bereal', label: 'BeReal', Icon: Square, placeholder: 'https://bereal.com/...', category: 'social' },
  { key: 'bluesky', label: 'Bluesky', Icon: Cloud, placeholder: 'https://bsky.app/profile/...', category: 'social' },
  { key: 'cameo', label: 'Cameo', Icon: Star, placeholder: 'https://cameo.com/...', category: 'make_money' },
  { key: 'clubhouse', label: 'Clubhouse', Icon: Mic, placeholder: 'https://clubhouse.com/@username', category: 'social' },
  { key: 'discord', label: 'Discord', Icon: MessageCircle, placeholder: 'https://discord.gg/...', category: 'social' },
  { key: 'etsy', label: 'Etsy', Icon: ShoppingBag, placeholder: 'https://etsy.com/shop/...', category: 'make_money' },
  { key: 'github', label: 'Github', Icon: Square, placeholder: 'https://github.com/username', category: 'social' },
  { key: 'kick', label: 'Kick', Icon: Play, placeholder: 'https://kick.com/username', category: 'media' },
  { key: 'linkedin', label: 'LinkedIn', Icon: MessageCircle, placeholder: 'https://linkedin.com/in/username', category: 'social', description: 'Share your LinkedIn.' },
  { key: 'mastodon', label: 'Mastodon', Icon: Cloud, placeholder: 'https://mastodon.social/@username', category: 'social' },
  { key: 'patreon', label: 'Patreon', Icon: Heart, placeholder: 'https://patreon.com/username', category: 'make_money' },
  { key: 'payment', label: 'Payment', Icon: DollarSign, placeholder: 'https://...', category: 'make_money' },
  { key: 'phone', label: 'Phone', Icon: Phone, placeholder: 'tel:+1234567890', category: 'contact' },
  { key: 'pinterest', label: 'Pinterest', Icon: Image, placeholder: 'https://pinterest.com/username', category: 'social' },
  { key: 'poshmark', label: 'Poshmark', Icon: ShoppingBag, placeholder: 'https://poshmark.com/...', category: 'make_money' },
  { key: 'signal', label: 'Signal', Icon: MessageCircle, placeholder: 'https://signal.me/...', category: 'contact' },
  { key: 'soundcloud', label: 'Soundcloud', Icon: Cloud, placeholder: 'https://soundcloud.com/username', category: 'media' },
  { key: 'spotify', label: 'Spotify', Icon: Music, placeholder: 'https://open.spotify.com/...', category: 'media', description: 'Share your latest or favorite music.' },
  { key: 'substack', label: 'Substack', Icon: BookOpen, placeholder: 'https://substack.com/@username', category: 'text', description: 'Share your newsletter.' },
  { key: 'telegram', label: 'Telegram', Icon: Send, placeholder: 'https://t.me/username', category: 'contact' },
  { key: 'twitch', label: 'Twitch', Icon: Video, placeholder: 'https://twitch.tv/username', category: 'media' },
  { key: 'personal_website', label: 'Personal Website', Icon: Globe, placeholder: 'https://...', category: 'contact' },
  { key: 'red_note', label: '小红书', Icon: Image, iconImage: '/red-note-icon.webp', placeholder: 'https://www.xiaohongshu.com/...', category: 'social', description: 'Share your 小红书 / Red Note.' },
  { key: 'lemon8', label: 'Lemon8', Icon: Square, placeholder: 'https://lemon8.com/...', category: 'social' },
  { key: 'bandsintown', label: 'Bandsintown', Icon: Music, placeholder: 'https://bandsintown.com/...', category: 'media' },
]

/** Add 弹窗「Suggested」优先展示的平台 */
export const SUGGESTED_PLATFORM_KEYS = ['instagram', 'tiktok', 'youtube', 'spotify', 'red_note', 'linkedin', 'whatsapp', 'email'] as const

/** 首页展示的社交图标行（保留原样）：这 4 个 + 后面的加号打开完整列表 */
export const DISPLAY_SOCIAL_KEYS = ['instagram', 'tiktok', 'whatsapp', 'email'] as const

export function getPlatformByKey(key: string): SocialPlatform | undefined {
  return ALL_SOCIAL_PLATFORMS.find((p) => p.key === key)
}

export function getPlaceholder(key: string): string {
  return getPlatformByKey(key)?.placeholder ?? 'https://...'
}
