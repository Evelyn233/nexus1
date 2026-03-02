import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/check-slug?slug=xxx
 * Returns { available: boolean } - whether the slug is available for use.
 * If user is logged in and the slug belongs to them, returns available: true.
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug')?.trim()
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
      return NextResponse.json({ available: false })
    }

    const session = await getServerSession(authOptions)
    const existing = await prisma.user.findUnique({
      where: { profileSlug: slug },
      select: { id: true, email: true },
    })
    if (!existing) {
      return NextResponse.json({ available: true })
    }
    if (session?.user?.email && existing.email === session.user.email) {
      return NextResponse.json({ available: true })
    }
    return NextResponse.json({ available: false })
  } catch {
    return NextResponse.json({ available: false })
  }
}
