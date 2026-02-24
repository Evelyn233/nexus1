'use client'

import { useState, useRef, useEffect } from 'react'

interface InputSectionProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAdd?: (value: string) => void
  onImageUpload?: (file: File) => void
  onImageToAI?: (file: File) => void
}

export default function InputSection({ value, onChange, onSend, onAdd, onImageUpload, onImageToAI }: InputSectionProps) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)
  const [addValue, setAddValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSend()
  }

  const handleAddText = () => {
    if (addValue.trim()) {
      onAdd?.(addValue.trim())
      setAddValue('')
      setShowTextInput(false)
      setShowAddMenu(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        onImageUpload?.(file)
      }
    }
    e.target.value = ''
    setShowAddMenu(false)
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageUpload?.(file)
    }
    e.target.value = ''
    setShowAddMenu(false)
  }

  const handleImageToAI = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onImageToAI?.(file)
    }
    e.target.value = ''
    setShowAddMenu(false)
  }

  const menuContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showAddMenu && menuContainerRef.current && !menuContainerRef.current.contains(target)) {
        setShowAddMenu(false)
      }
    }
    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddMenu])

  return (
    <div className="relative" ref={menuContainerRef}>
      {showAddMenu && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[200px] z-50">
          <div className="space-y-1">
            <button
              onClick={() => { setShowTextInput(true); setShowAddMenu(false) }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2"
            >
              <span>✏️</span>
              <span>Add Text</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2"
            >
              <span>🖼️</span>
              <span>Add Local Image</span>
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2"
            >
              <span>📷</span>
              <span>Take Photo</span>
            </button>
            <button
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) onImageToAI?.(file)
                }
                input.click()
                setShowAddMenu(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2"
            >
              <span>🤖</span>
              <span>Send Image to AI</span>
            </button>
          </div>
        </div>
      )}

      {showTextInput && (
        <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              placeholder="Enter content to add..."
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleAddText()}
              autoFocus
            />
            <button
              onClick={handleAddText}
              disabled={!addValue.trim()}
              className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
            <button
              onClick={() => { setShowTextInput(false); setAddValue('') }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} className="hidden" />

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap relative"
          title="Add Content"
        >
          ➕ Add
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="和 AI 聊聊这个人"
          className="input-base flex-1"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="button-base whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
      <p className="mt-2 text-xs text-gray-500 text-center">您的输入将不会发送给 profile 主人。</p>
    </div>
  )
}
