'use client'

import { useState, useRef } from 'react'
import { Camera, MessageCircle, ChevronRight, Check } from 'lucide-react'

const ONBOARDING_DONE_KEY = 'newUserOnboardingComplete'
const ONBOARDING_PHOTO_KEY = 'newUserOnboardingPhoto'
const ONBOARDING_INTRO_KEY = 'newUserOnboardingIntro'

export function getOnboardingDone(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ONBOARDING_DONE_KEY) === '1'
}

export function setOnboardingDone(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ONBOARDING_DONE_KEY, '1')
}

interface NewUserOnboardingProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: (photoDataUrl: string | null, intro: string) => void
}

export default function NewUserOnboarding({ isOpen, onClose, onComplete }: NewUserOnboardingProps) {
  const [step, setStep] = useState(1)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [intro, setIntro] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPhotoDataUrl(dataUrl)
      try {
        localStorage.setItem(ONBOARDING_PHOTO_KEY, dataUrl)
      } catch (_) {}
    }
    reader.readAsDataURL(file)
  }

  const handleNext = () => {
    if (step === 1) setStep(2)
    else {
      try {
        localStorage.setItem(ONBOARDING_INTRO_KEY, intro)
      } catch (_) {}
      setOnboardingDone()
      onComplete?.(photoDataUrl, intro)
      onClose()
    }
  }

  const canNext = step === 1 ? !!photoDataUrl : true

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* 步骤指示 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-teal-500' : 'bg-gray-200'}`} />
          <span className="w-6 h-0.5 bg-gray-200" />
          <span className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-teal-500' : 'bg-gray-200'}`} />
        </div>

        {step === 1 && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
                <Camera className="w-8 h-8 text-teal-500" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">上传一张照片</h2>
            <p className="text-sm text-gray-500 text-center mb-6">选一张你喜欢的照片，我们会用它来认识你</p>
            <p className="text-xs text-gray-400 text-center mb-2">若提示权限被拒，请在弹窗中允许访问照片，或在手机设置中开启</p>
            <label className="relative flex w-full aspect-[4/3] min-h-[120px] rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 flex-col items-center justify-center gap-2 transition-colors cursor-pointer overflow-hidden">
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="预览" className="w-full h-full object-cover rounded-xl pointer-events-none" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <Camera className="w-10 h-10 text-gray-400" />
                  <span className="text-sm text-gray-500">点击或拖入照片</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                style={{ fontSize: '16px' }}
                onChange={handlePhotoChange}
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-teal-500" />
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 mb-4">
              <p className="text-sm text-gray-700">
                你好～简单介绍一下自己吧，一句话就好。例如：我在上海做 AI 产品，喜欢艺术电影和独立音乐。
              </p>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">简单介绍一下自己</h2>
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="一句话介绍自己…"
              className="w-full min-h-[100px] px-4 py-3 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 resize-none"
              maxLength={300}
            />
          </>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={step === 1 && !canNext}
          className="mt-8 w-full py-3 rounded-xl bg-teal-500 text-white font-medium flex items-center justify-center gap-2 hover:bg-teal-600 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {step === 2 ? (
            <>
              <Check className="w-5 h-5" />
              完成
            </>
          ) : (
            <>
              下一步
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

        {step === 2 && (
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            跳过，稍后再说
          </button>
        )}
      </div>
    </div>
  )
}
