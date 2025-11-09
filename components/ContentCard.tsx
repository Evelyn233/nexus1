'use client'

import Image from 'next/image'
import Link from 'next/link'

interface ContentCardProps {
  data: {
    id: number
    image?: string
    generatedImage?: string
    title: string
    subtitle: string
    moduleLabel?: string
    quote?: string
    suggestion?: string
    source?: string
    type: 'article' | 'ai-suggestion'
    bgColor?: string
    authorInitial?: string
    authorName?: string
    href?: string
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
              className="object-cover object-top"
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

  if (data.moduleLabel && ['CURRENT', 'WEEKEND'].includes(data.moduleLabel)) {
    const currentCard = (
      <div className="magazine-card relative h-full overflow-hidden text-white">
        {data.image && (
          <Image
            src={data.image}
            alt={data.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        <span className="absolute top-3 left-3 rounded-full bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.4em] backdrop-blur-sm">
          {data.moduleLabel}
        </span>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-base font-semibold leading-tight text-white drop-shadow-md">
            {data.title}
          </h3>
        </div>
      </div>
    )

    if (data.href) {
      return (
        <Link
          href={data.href}
          className="block h-full hover:-translate-y-1 hover:shadow-xl transition-all duration-200"
        >
          {currentCard}
        </Link>
      )
    }

    return currentCard
  }

  const card = (
    <div
      className={`magazine-card flex flex-col h-full`}
    >
      {data.image && (
        <div className="relative h-48 w-full">
          <Image
            src={data.image}
            alt={data.title}
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
      )}

      <div
        className={`flex flex-col flex-grow p-2`}
      >
        {data.moduleLabel && (
          <div
            className={`flex items-center justify-between text-magazine-primary`}
          >
            <span className="text-[10px] uppercase tracking-[0.35em]">
              {data.moduleLabel}
            </span>
          </div>
        )}

        <h3
          className={`font-semibold leading-tight text-sm text-magazine-dark`}
        >
          {data.title}
        </h3>

        {data.subtitle && (
          <p
            className={`text-xs leading-relaxed text-magazine-gray`}
          >
            {data.subtitle}
          </p>
        )}

        <div className="flex items-center gap-2 mt-auto">
          <div
            className="w-4 h-4 bg-magazine-primary rounded-full flex items-center justify-center"
          >
            <span className="text-white text-xs font-bold">{data.authorInitial || 'E'}</span>
          </div>
          <span className="text-xs text-magazine-gray font-medium">{data.authorName || 'Evelyn'}</span>
        </div>
      </div>
    </div>
  )

  if (data.href) {
    return (
      <Link href={data.href} className="block h-full hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
        {card}
      </Link>
    )
  }

  return card
}
