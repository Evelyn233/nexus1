'use client'

interface InputSectionProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
}

export default function InputSection({ value, onChange, onSend }: InputSectionProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSend()
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-3">
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
  )
}
