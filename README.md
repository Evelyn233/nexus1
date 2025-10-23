# Magazine App

一个基于 Next.js 的移动端杂志风格应用，具有 AI 生图功能。

## 功能特性

- 📱 移动端优化的响应式设计
- 🎨 杂志风格的卡片布局
- 🤖 AI 智能生图功能
- 🚀 专门的生图页面
- 💬 交互式输入界面
- ⚡ 快速生成按钮
- 🔍 搜索和通知功能

## 技术栈

- **框架**: Next.js 14
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **语言**: TypeScript

## 快速开始

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
magazine/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   └── generate-image/ # 生图API
│   ├── generate/          # 生图页面
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 主页面
├── components/            # React 组件
│   ├── ContentCard.tsx    # 内容卡片组件
│   └── InputSection.tsx   # 输入区域组件
├── lib/                   # 工具库
│   ├── config.ts          # 配置文件
│   └── imageGeneration.ts # 生图服务
├── public/                # 静态资源
└── ...配置文件
```

## 界面说明

- **顶部**: Logo 和搜索/通知图标
- **快速生成区**: 预设的生图快捷按钮
- **主内容区**: 2x2 网格布局的内容卡片
- **底部**: 固定输入框和发送按钮
- **生图页面**: 专门的图片生成和展示页面

## 生图功能

### 使用方式
1. 在主页输入框输入需求，如"我明天面试穿什么"
2. 点击"发送"或选择快速生成按钮
3. 跳转到专门的生图页面
4. 等待AI生成图片
5. 可以下载、分享或重新生成

### API集成
- 主要API: 使用API Key `17b4a6a5-1a2b-4c3d-827b-cef480fd1580`
- 备用API: 本地模拟API，确保功能可用
- 支持多种图片尺寸和风格

## 自定义

- 修改 `tailwind.config.js` 中的颜色主题
- 在 `app/page.tsx` 中更新内容数据
- 调整 `components/` 中的组件样式
