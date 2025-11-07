'use client'

import { useState } from 'react'

interface InputSectionProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAdd?: (value: string) => void
}

export default function InputSection({ value, onChange, onSend, onAdd }: InputSectionProps) {
  const [showAddInput, setShowAddInput] = useState(false)
  const [addValue, setAddValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSend()
  }

  const handleAdd = () => {
    if (addValue.trim()) {
      onAdd?.(addValue.trim())
      setAddValue('')
      setShowAddInput(false)
    }
  }

  return (
    <div>
      {showAddInput && (
        <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              placeholder="输入要添加的内容..."
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-magazine-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!addValue.trim()}
              className="px-3 py-1.5 text-sm bg-magazine-primary text-white rounded-lg hover:bg-magazine-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认
            </button>
            <button
              onClick={() => {
                setShowAddInput(false)
                setAddValue('')
              }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setShowAddInput(!showAddInput)}
          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
          title="添加自定义内容到快速生成"
        >
          ➕ 添加
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="分享你的想法、情绪或生活..."
          className="magazine-input flex-1"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="magazine-button whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          发送
        </button>
      </form>
    </div>
  )
}
