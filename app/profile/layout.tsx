import { Suspense } from 'react'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      {children}
    </Suspense>
  )
}
