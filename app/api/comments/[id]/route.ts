import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 删除评论
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const { id: commentId } = await params
    
    // 查找评论
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        content: true
      }
    })
    
    if (!comment) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 })
    }
    
    // 获取用户
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    // 验证权限：只能删除自己的评论或自己发布的内容的评论
    if (comment.userId !== user.id && comment.content.userId !== user.id) {
      return NextResponse.json({ error: '无权删除此评论' }, { status: 403 })
    }
    
    // 删除评论
    await prisma.comment.delete({
      where: { id: commentId }
    })
    
    return NextResponse.json({
      success: true,
      message: '评论已删除'
    })
  } catch (error) {
    console.error('❌ [COMMENT-API] 删除评论失败:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}

