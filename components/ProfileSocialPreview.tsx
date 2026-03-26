'use client'

import { ensureAbsoluteUrl } from '@/lib/ensureAbsoluteUrl'
import { getPlatformByKey } from '@/lib/socialPlatforms'

type Props = {
  showSocialInPreview: boolean
  socialLinks: Record<string, string>
}

export function ProfileSocialPreview({ showSocialInPreview, socialLinks }: Props) {
  if (!showSocialInPreview) return null

  const keys = Object.keys(socialLinks)
  return (
    <div className="flex flex-col items-center w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
      <p className="text-[10px] text-amber-700/90 mb-0.5">Empty fields won&apos;t be publicly visible</p>
      <p className="text-xs text-gray-500 mb-1.5">Social media</p>
      {keys.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No social links yet — add via +</p>
      ) : (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {keys.map((key) => {
            const p = getPlatformByKey(key)
            if (!p) return null
            const { label, Icon, iconImage } = p
            const url = socialLinks[key]
            if (!url) return null
            return (
              <a
                key={key}
                href={ensureAbsoluteUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white hover:shadow transition-all border border-white/80 overflow-hidden"
                title={label}
              >
                {iconImage ? (
                  <img src={iconImage} alt={label} className="w-6 h-6 object-contain" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

