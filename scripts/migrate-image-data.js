/**
 * Migration script (CommonJS): fetch legacy image URLs and persist them as Base64 data URLs.
 *
 * Usage:
 *   node scripts/migrate-image-data.js
 *
 * The script iterates over `user_generated_contents.images`, downloads remote URLs that
 * still respond, converts them to `data:` URLs, and updates the record in-place. This
 * prevents old signed URLs from expiring on the frontend.
 */

const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })
dotenv.config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const stats = {
  totalContents: 0,
  updatedContents: 0,
  processedImages: 0,
  upgradedImages: 0,
  failedImages: 0
}

function determineMimeType(url, headers) {
  const headerType = headers && headers.get('content-type')
  if (headerType && headerType !== 'application/octet-stream') {
    return headerType.split(';')[0]?.trim() || 'image/jpeg'
  }

  const lower = url.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  return 'image/jpeg'
}

async function fetchAsDataUrl(url) {
  if (!url || url.startsWith('data:')) {
    return url || null
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
    const mimeType = determineMimeType(url, response.headers)
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error('❌ [MIGRATE] Failed to download image:', url, error?.message || error)
    stats.failedImages += 1
    return null
  }
}

function parseImages(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.warn('⚠️ [MIGRATE] Failed to parse images JSON:', error)
      return []
    }
  }
  return []
}

function stringifyImages(images) {
  return JSON.stringify(images)
}

async function migrateChunk(contents) {
  for (const content of contents) {
    stats.totalContents += 1
    const originalImages = parseImages(content.images)

    if (originalImages.length === 0) continue

    let hasUpdates = false
    const migratedImages = []

    for (const item of originalImages) {
      stats.processedImages += 1

      if (typeof item === 'string') {
        if (item.startsWith('data:')) {
          migratedImages.push(item)
          continue
        }
        const dataUrl = await fetchAsDataUrl(item)
        if (dataUrl) {
          migratedImages.push({
            sceneIndex: migratedImages.length,
            imageUrl: item,
            imageDataUrl: dataUrl
          })
          stats.upgradedImages += 1
          hasUpdates = true
        } else {
          migratedImages.push(item)
        }
        continue
      }

      const imgObj = { ...item }
      const hasDataUrl =
        typeof imgObj.imageDataUrl === 'string' && imgObj.imageDataUrl.startsWith('data:')

      if (!hasDataUrl) {
        const candidateUrl =
          (typeof imgObj.imageUrl === 'string' && imgObj.imageUrl) ||
          (typeof imgObj.url === 'string' && imgObj.url) ||
          (typeof imgObj.src === 'string' && imgObj.src) ||
          (typeof imgObj.image_path === 'string' && imgObj.image_path) ||
          (typeof imgObj.imageURI === 'string' && imgObj.imageURI) ||
          (typeof imgObj.uri === 'string' && imgObj.uri) ||
          ''

        if (candidateUrl && !candidateUrl.startsWith('data:')) {
          const dataUrl = await fetchAsDataUrl(candidateUrl)
          if (dataUrl) {
            imgObj.imageDataUrl = dataUrl
            stats.upgradedImages += 1
            hasUpdates = true
          }
        }
      }

      migratedImages.push(imgObj)
    }

    if (hasUpdates) {
      const updatedJson = stringifyImages(migratedImages)
      try {
        await prisma.userGeneratedContent.update({
          where: { id: content.id },
          data: {
            images: updatedJson
          }
        })
        stats.updatedContents += 1
        console.log(`✅ [MIGRATE] Updated content ${content.id} with ${migratedImages.length} images`)
      } catch (error) {
        console.error(`❌ [MIGRATE] Failed to update content ${content.id}:`, error)
      }
    }
  }
}

async function main() {
  console.log('🚀 [MIGRATE] Start migrating legacy images to data URLs...')

  const pageSize = 25
  let page = 0

  while (true) {
    const contents = await prisma.userGeneratedContent.findMany({
      skip: page * pageSize,
      take: pageSize,
      select: {
        id: true,
        images: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    if (contents.length === 0) {
      break
    }

    console.log(`🔄 [MIGRATE] Processing batch ${page + 1} (${contents.length} records)...`)
    await migrateChunk(contents)
    page += 1
  }

  console.log('🏁 [MIGRATE] Migration completed.')
  console.log(
    JSON.stringify(
      {
        totalContents: stats.totalContents,
        updatedContents: stats.updatedContents,
        processedImages: stats.processedImages,
        upgradedImages: stats.upgradedImages,
        failedImages: stats.failedImages
      },
      null,
      2
    )
  )
}

main()
  .catch(error => {
    console.error('❌ [MIGRATE] Unexpected error:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

