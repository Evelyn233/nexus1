'use client'

type Props = {
  onlineValue: string
  offlineValue: string
  onChangeOnline: (value: string) => void
  onBlurOnline: () => void
  onChangeOffline: (value: string) => void
  onBlurOffline: () => void
}

export function ProfileEngagePreview({
  onlineValue,
  offlineValue,
  onChangeOnline,
  onBlurOnline,
  onChangeOffline,
  onBlurOffline,
}: Props) {
  return (
    <div className="flex flex-col w-full px-4 pt-2 pb-4 shrink-0 border-t border-white/50">
      <p className="text-[10px] text-gray-500 mb-1">How to engage me</p>
      <div className="space-y-1">
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">Online</p>
          <input
            type="text"
            placeholder="e.g. message me, video call, community chat"
            value={onlineValue}
            onChange={(e) => onChangeOnline(e.target.value)}
            onBlur={onBlurOnline}
            className="w-full px-2 py-1 text-[10px] bg-white/90 border border-white/80 rounded placeholder-gray-400 text-gray-800"
          />
        </div>
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">Offline</p>
          <input
            type="text"
            placeholder="e.g. coffee chat, meetup, co-shoot"
            value={offlineValue}
            onChange={(e) => onChangeOffline(e.target.value)}
            onBlur={onBlurOffline}
            className="w-full px-2 py-1 text-[10px] bg-white/90 border border-white/80 rounded placeholder-gray-400 text-gray-800"
          />
        </div>
      </div>
    </div>
  )
}

