/** @type {import('next').NextConfig} */
const nextConfig = {
  // 环境变量配置
  env: {
    DATABASE_URL: "postgresql://neondb_owner:npg_y5RWTMOsXd4F@ep-gentle-wave-a458k1e4-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=10&pool_timeout=10",
    NEXTAUTH_URL: "http://localhost:3000",
    NEXTAUTH_SECRET: "c8bbf0a4c60d5a4845aedf3c15daffd241d7759a466a9b57fc2494d916635070",
    DEEPSEEK_API_KEY: "sk-e3911ff08dae4f4fb59c7b521e2a5415",
    SEEDREAM_API_KEY: "17b4a6a5-1a2b-4c3d-827b-cef480fd1580"
  },
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
    unoptimized: true,  // 临时禁用优化，避免404错误
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
