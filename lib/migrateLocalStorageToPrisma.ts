/**
 * 数据迁移服务
 * 将localStorage中的数据迁移到Prisma数据库
 */

import prisma from './prisma'

export interface DataDifference {
  localStorageUsers: number
  prismaUsers: number
  localStorageSessions: number
  prismaSessions: number
  localStorageContents: number
  prismaContents: number
  hasDifference: boolean
}

/**
 * 检查localStorage和Prisma数据库的数据差异
 */
export async function checkDataDifference(): Promise<DataDifference> {   
  try {
    // 检查localStorage中的数据
    const localStorageUsers = JSON.parse(localStorage.getItem('users') || '[]').length                                                                   
    const localStorageSessions = JSON.parse(localStorage.getItem('chatSessions') || '[]').length                                                         
    const localStorageContents = JSON.parse(localStorage.getItem('userGeneratedContents') || '[]').length                                                

    // 检查Prisma数据库中的数据
    const prismaUsers = await prisma.user.count()
    const prismaSessions = await prisma.chatSession.count()
    const prismaContents = await prisma.userGeneratedContent.count()     

    const hasDifference =
      localStorageUsers !== prismaUsers ||
      localStorageSessions !== prismaSessions ||
      localStorageContents !== prismaContents

    return {
      localStorageUsers,
      prismaUsers,
      localStorageSessions,
      prismaSessions,
      localStorageContents,
      prismaContents,
      hasDifference
    }
  } catch (error) {
    console.error('❌ 检查数据差异失败:', error)
    throw error
  }
}

/**
 * 将localStorage数据迁移到Prisma数据库
 */
export async function migrateLocalStorageToPrisma(): Promise<{
  success: boolean
  migrated: {
    users: number
    sessions: number
    contents: number
  }
  errors: string[]
}> {
  const errors: string[] = []
  const migrated = {
    users: 0,
    sessions: 0,
    contents: 0
  }

  try {
    // 迁移用户数据
    const users = JSON.parse(localStorage.getItem('users') || '[]')      
    for (const user of users) {
      try {
        await prisma.user.upsert({
          where: { email: user.email },
          update: user,
          create: user
        })
        migrated.users++
      } catch (error) {
        errors.push(`用户迁移失败: ${user.email} - ${error}`)
      }
    }

    // 迁移聊天会话数据
    const sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]')                                                                            
    for (const session of sessions) {
      try {
        // 需要先找到对应的用户ID
        const user = await prisma.user.findFirst({
          where: { email: session.userEmail }
        })

        if (user) {
          await prisma.chatSession.upsert({
            where: { id: session.id },
            update: {
              userId: user.id,
              title: session.title,
              initialPrompt: session.initialPrompt,
              messages: session.messages,
              answers: session.answers,
              questions: session.questions
            },
            create: {
              id: session.id,
              userId: user.id,
              title: session.title,
              initialPrompt: session.initialPrompt,
              messages: session.messages,
              answers: session.answers,
              questions: session.questions
            }
          })
          migrated.sessions++
        }
      } catch (error) {
        errors.push(`会话迁移失败: ${session.id} - ${error}`)
      }
    }

    // 迁移生成内容数据
    const contents = JSON.parse(localStorage.getItem('userGeneratedContents') || '[]')                                                                   
    for (const content of contents) {
      try {
        // 需要先找到对应的用户ID
        const user = await prisma.user.findFirst({
          where: { email: content.userEmail }
        })

        if (user) {
          await prisma.userGeneratedContent.upsert({
            where: { id: content.id },
            update: {
              userId: user.id,
              initialPrompt: content.initialPrompt,
              questions: content.questions,
              answers: content.answers,
              scenes: content.scenes,
              storyNarrative: content.storyNarrative,
              images: content.images,
              imageCount: content.imageCount,
              userSnapshot: content.userSnapshot,
              metadataSnapshot: content.metadataSnapshot,
              status: content.status,
              tags: content.tags,
              category: content.category
            },
            create: {
              id: content.id,
              userId: user.id,
              initialPrompt: content.initialPrompt,
              questions: content.questions,
              answers: content.answers,
              scenes: content.scenes,
              storyNarrative: content.storyNarrative,
              images: content.images,
              imageCount: content.imageCount,
              userSnapshot: content.userSnapshot,
              metadataSnapshot: content.metadataSnapshot,
              status: content.status,
              tags: content.tags,
              category: content.category
            }
          })
          migrated.contents++
        }
      } catch (error) {
        errors.push(`内容迁移失败: ${content.id} - ${error}`)
      }
    }

    return {
      success: errors.length === 0,
      migrated,
      errors
    }
  } catch (error) {
    console.error('❌ 数据迁移失败:', error)
    return {
      success: false,
      migrated,
      errors: [...errors, `迁移过程失败: ${error}`]
    }
  }
}

