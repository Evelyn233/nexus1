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
    authorInitial?: string
    authorName?: string
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="magazine-card flex flex-col h-full">
      {data.image && (
        <div className="relative h-48 w-full">
          <Image
            src={data.image}
            alt={data.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
      )}
      
      <div className="p-2 flex flex-col flex-grow">
        <h3 className="font-semibold text-sm mb-1 text-magazine-dark leading-tight">
          {data.title}
        </h3>
        
        <p className="text-xs text-magazine-gray mb-1 leading-relaxed flex-grow">
          {data.subtitle}
        </p>
        
        {/* 用户头像和用户名 - 移到底部 */}
        <div className="flex items-center gap-1 mt-auto">
          <div className="w-4 h-4 bg-magazine-primary rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{data.authorInitial || 'E'}</span>
          </div>
          <span className="text-xs text-magazine-gray font-medium">{data.authorName || 'Evelyn'}</span>
        </div>
      </div>
    </div>
  )
}
