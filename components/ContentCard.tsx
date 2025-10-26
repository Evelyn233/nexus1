'use client'

import Image from 'next/image'

interface ContentCardProps {
  data: {
    id: number
    image?: string
    generatedImage?: string
    title: string
    subtitle: string
    quote?: string
    suggestion?: string
    source?: string
    type: 'article' | 'ai-suggestion'
    bgColor?: string
  }
}

export default function ContentCard({ data }: ContentCardProps) {
  if (data.type === 'ai-suggestion') {
    return (
      <div className={`magazine-card ${data.bgColor} p-4 h-full flex flex-col justify-between`}>
        {data.generatedImage && (
          <div className="relative h-32 w-full mb-4 rounded-lg overflow-hidden">
            <Image
              src={data.generatedImage}
              alt={data.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
        )}
        
        <div>
          <h3 className="font-semibold text-lg mb-2 text-magazine-dark">
            {data.title}
          </h3>
          <p className="text-sm text-magazine-gray mb-4">
            {data.subtitle}
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm text-magazine-dark">
              {data.suggestion}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-magazine-gray">
              {data.source}
            </p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-magazine-primary rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">E</span>
              </div>
              <span className="text-xs text-magazine-gray font-medium">Evelyn</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="magazine-card h-full">
      {data.image && (
        <div className="relative h-40 w-full">
          <Image
            src={data.image}
            alt={data.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
      )}
      
      <div className="p-4 flex flex-col h-full">
        <div className="flex-1">
          <h3 className="font-semibold text-base mb-2 text-magazine-dark leading-tight">
            {data.title}
          </h3>
          <p className="text-sm text-magazine-gray mb-3 leading-relaxed">
            {data.subtitle}
          </p>
          {data.quote && (
            <blockquote className="text-sm text-magazine-dark italic border-l-2 border-magazine-primary pl-3">
              {data.quote}
            </blockquote>
          )}
        </div>
        
        {/* 用户头像和用户名 */}
        <div className="flex items-center gap-2 pt-3 border-t border-magazine-primary mt-auto">
          <div className="w-6 h-6 bg-magazine-primary rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">E</span>
          </div>
          <span className="text-xs text-magazine-gray font-medium">Evelyn</span>
        </div>
      </div>
    </div>
  )
}
