'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ProjectLandingRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f14]" />}>
      <RedirectToHome />
    </Suspense>
  )
}

function RedirectToHome() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const q = searchParams.toString()
    router.replace(q ? `/?${q}` : '/')
  }, [router, searchParams])

  return <div className="min-h-screen bg-[#0a0f14]" />
}
