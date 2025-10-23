#!/bin/bash

# 自动部署脚本
echo "🚀 开始自动部署到Vercel..."

# 1. 确保代码已提交
git add .
git commit -m "Auto deploy with environment variables"

# 2. 推送到GitHub
git push origin main

# 3. 等待Vercel自动部署
echo "✅ 代码已推送到GitHub，Vercel将自动部署"
echo "🌐 部署完成后访问: https://inflow-nu.vercel.app/"

# 4. 提示用户设置数据库
echo ""
echo "📋 接下来需要在Vercel Dashboard中设置："
echo "1. 进入 https://vercel.com/dashboard"
echo "2. 选择你的项目 → Storage → Create Database → Postgres"
echo "3. 复制数据库连接字符串"
echo "4. 在项目设置中添加环境变量 DATABASE_URL"
