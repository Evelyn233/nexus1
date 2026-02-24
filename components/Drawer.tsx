'use client'

import { useState, useEffect } from 'react'
import { X, Minimize2, Maximize2 } from 'lucide-react'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** 底部固定区域（不随内容滚动），如确定/取消按钮 */
  footer?: React.ReactNode
  /** 是否显示缩小按钮，默认 true */
  minimizable?: boolean
  /** 从右侧滑入的宽度，默认 max-w-md */
  width?: string
  /** 缩小后悬浮条显示的文字，默认与 title 相同 */
  minimizedTitle?: string
}

/**
 * 拉窗式抽屉：从右侧滑入，可缩小为悬浮条，不跳转页面。
 */
export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  minimizable = true,
  width = 'max-w-md',
  minimizedTitle
}: DrawerProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  // 打开时重置缩小状态
  useEffect(() => {
    if (isOpen) setIsMinimized(false)
  }, [isOpen])

  if (!isOpen) return null

  const displayTitle = minimizedTitle ?? title

  // 缩小状态：右下角悬浮条
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full bg-white shadow-lg border border-gray-200 px-4 py-2.5 cursor-pointer hover:shadow-xl transition-shadow"
        onClick={() => setIsMinimized(false)}
      >
        <Maximize2 className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-800 max-w-[180px] truncate">{displayTitle}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    )
  }

  // 展开状态：从右侧滑入
  return (
    <>
      {/* 遮罩：点击关闭 */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed top-0 right-0 h-full ${width} w-full bg-white shadow-2xl z-50 flex flex-col animate-drawer-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{title}</h2>
          <div className="flex items-center gap-1">
            {minimizable && (
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-gray-200">{footer}</div>}
      </div>
    </>
  )
}
