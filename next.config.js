/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除过时的 appDir 配置，Next.js 14 默认启用
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: false,  // 允许优化，但通过quality控制
    // 图片质量优化配置
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

module.exports = nextConfig
