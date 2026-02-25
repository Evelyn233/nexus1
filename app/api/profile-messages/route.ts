import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma, { withRetry } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type ProfileMessageRow = {
  id: string
  text: string
  createdAt: Date
  fromUser: { id: string; name: string | null; image: string | null } | null
}

// Prisma Client 需包含 profileMessage（运行 npx prisma generate 后才有）
const profileMessage = 'profileMessage' in prisma ? (prisma as unknown as { profileMessage: any }).profileMessage : undefined

/** GET: 获取当前用户收到的 profile 消息（收件箱） */
export async function GET() {
  try {
    await prisma.$connect()
    if (!profileMessage) {
      console.error('❌ [PROFILE-MESSAGES] prisma.profileMessage 未定义，请运行: npx prisma generate && npx prisma migrate dev')
      return NextResponse.json(
        { error: 'Profile messages not available. Run: npx prisma generate && npx prisma migrate dev' },
        { status: 503 }
      )
    }
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const email = session.user.email

    const user = await withRetry(() =>
      prisma.user.findUnique({ where: { email } })
    )
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const messages = await withRetry(() => profileMessage.findMany({
      where: { toUserId: user.id },
      include: {
        fromUser: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })) as ProfileMessageRow[]

    return NextResponse.json({
      success: true,
      messages: messages.map((m: ProfileMessageRow) => ({
        id: m.id,
        text: m.text,
        createdAt: m.createdAt,
        from: m.fromUser
          ? { id: m.fromUser.id, name: m.fromUser.name || 'Someone', image: m.fromUser.image }
          : null
      }))
    })
  } catch (e) {
    console.error('❌ [PROFILE-MESSAGES] GET failed:', e)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

/** POST: 发送一条 profile 消息给某人（别人问 Evelyn 的问题） */
export async function POST(request: NextRequest) {
  try {
    await prisma.$connect()
    if (!profileMessage) {
      console.error('❌ [PROFILE-MESSAGES] prisma.profileMessage 未定义，请运行: npx prisma generate && npx prisma migrate dev')
      return NextResponse.json(
        { error: 'Profile messages not available. Run: npx prisma generate && npx prisma migrate dev' },
        { status: 503 }
      )
    }
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { toUserId, text } = body as { toUserId?: string; text?: string }

    if (!toUserId || !text || !String(text).trim()) {
      return NextResponse.json({ error: 'toUserId and text are required' }, { status: 400 })
    }

    const email = session?.user?.email ?? undefined
    const fromUserId = email
      ? (await withRetry(() => prisma.user.findUnique({ where: { email } })))?.id ?? null
      : null

    const msg = await withRetry(() => profileMessage.create({
      data: {
        toUserId,
        ...(fromUserId != null ? { fromUserId } : {}),
        text: String(text).trim()
      }
    })) as { id: string; text: string; createdAt: Date }

    return NextResponse.json({ success: true, message: { id: msg.id, text: msg.text, createdAt: msg.createdAt } })
  } catch (e) {
    console.error('❌ [PROFILE-MESSAGES] POST failed:', e)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
