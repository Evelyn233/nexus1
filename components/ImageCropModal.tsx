'use client'

import { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (e) => reject(e))
    if (!url.startsWith('blob:')) image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

/** 根据裁剪区域从图片生成裁剪后的 Blob（用于上传） */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Canvas is empty'))
        else resolve(blob)
      },
      'image/jpeg',
      0.9
    )
  })
}

/** 将 Blob 转为 data URL（便于预览或直接上传 base64） */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

interface ImageCropModalProps {
  imageSrc: string
  isOpen: boolean
  onClose: () => void
  onConfirm: (blob: Blob) => void
  aspect?: number
  title?: string
  /** 头像模式：1:1 圆形裁剪，输出方形图（显示时用 rounded-full 即圆形） */
  circularAvatar?: boolean
}

export default function ImageCropModal({
  imageSrc,
  isOpen,
  onClose,
  onConfirm,
  aspect = 4 / 3,
  title = '裁剪照片',
  circularAvatar = false,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setBusy(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onConfirm(blob)
      onClose()
    } catch (e) {
      console.error('Crop failed:', e)
      alert('裁剪失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
        <span className="text-white font-medium">{title}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-white/90 hover:text-white"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="px-4 py-1.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? '处理中…' : '确定'}
          </button>
        </div>
      </div>
      <div className="flex-1 relative min-h-0">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={circularAvatar ? 1 : aspect}
          cropShape={circularAvatar ? 'round' : 'rect'}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{ containerStyle: { backgroundColor: '#000' } }}
        />
      </div>
      <div className="p-4 border-t border-white/20">
        <label className="flex items-center gap-3 text-white/90 text-sm">
          <span>缩放</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 max-w-[200px]"
          />
        </label>
      </div>
    </div>
  )
}
