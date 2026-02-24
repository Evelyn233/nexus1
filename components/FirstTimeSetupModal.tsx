'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import Drawer from '@/components/Drawer'

interface FirstTimeSetupModalProps {
  isOpen: boolean
  onClose: () => void
  currentStep?: number  // 外部控制的当前步骤
}

export default function FirstTimeSetupModal({ isOpen, onClose, currentStep: externalStep }: FirstTimeSetupModalProps) {
  const [internalStep, setInternalStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  // 使用外部传入的步骤（如果有），否则使用内部定时器
  const currentStep = externalStep !== undefined ? externalStep : internalStep

  const steps = [
    {
      title: 'Analyzing your information...',
      description: 'AI is deeply analyzing your personality traits and preferences',
      icon: <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    },
    {
      title: 'Generating personalized profile...',
      description: 'Creating your exclusive user profile based on your information',
      icon: <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
    },
    {
      title: 'Building memory system...',
      description: 'Establishing an intelligent memory and learning system for you',
      icon: <Loader2 className="w-6 h-6 animate-spin text-green-500" />
    },
    {
      title: 'Completing initialization...',
      description: 'All settings are complete, ready to start your personalized experience',
      icon: <CheckCircle className="w-6 h-6 text-green-500" />
    }
  ]

  // 检查是否完成
  useEffect(() => {
    if (currentStep >= steps.length - 1) {
      setIsComplete(true)
      // 1.5秒后自动关闭
      const closeTimer = setTimeout(() => {
        onClose()
      }, 1500)
      return () => clearTimeout(closeTimer)
    }
  }, [currentStep, steps.length, onClose])

  // 只有在没有外部控制时才使用定时器（向后兼容）
  useEffect(() => {
    if (!isOpen) {
      // 重置状态
      setInternalStep(0)
      setIsComplete(false)
      return
    }

    // 如果有外部控制，不使用定时器
    if (externalStep !== undefined) {
      return
    }

    const timer = setInterval(() => {
      setInternalStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1
        } else {
          clearInterval(timer)
          return prev
        }
      })
    }, 1200) // 每1.2秒切换一个步骤

    return () => clearInterval(timer)
  }, [isOpen, externalStep, steps.length])

  if (!isOpen) return null

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="First Time Setup" minimizable={true}>
      <div className="p-6 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">✨</span>
          </div>
          <p className="text-gray-600">Creating your personalized profile, please wait...</p>
        </div>
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="text-sm text-gray-500">{currentStep + 1} / {steps.length}</div>
        </div>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${index === currentStep ? 'bg-blue-50 border border-blue-200' : index < currentStep ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
              <div className="flex-shrink-0">{index < currentStep ? <CheckCircle className="w-6 h-6 text-green-500" /> : step.icon}</div>
              <div className="flex-1 text-left">
                <div className={`font-medium ${index === currentStep ? 'text-blue-800' : index < currentStep ? 'text-green-800' : 'text-gray-500'}`}>{step.title}</div>
                <div className={`text-sm ${index === currentStep ? 'text-blue-600' : index < currentStep ? 'text-green-600' : 'text-gray-400'}`}>{step.description}</div>
              </div>
            </div>
          ))}
        </div>
        {isComplete && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center space-x-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Initialization Complete!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">Ready to start your personalized experience...</p>
          </div>
        )}
      </div>
    </Drawer>
  )
}
