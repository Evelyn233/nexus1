# 邮件邀请功能配置说明

和登录/忘记密码发邮件一样，邀请功能通过第三方邮件服务发送。本项目使用 [Resend](https://resend.com)。

## 配置步骤

1. **注册 Resend**  
   访问 https://resend.com 注册账号。

2. **获取 API Key**  
   - 登录 Resend Dashboard  
   - 进入 API Keys → Create API Key  
   - 复制生成的 `re_xxxxx` 密钥  

3. **配置环境变量**  
   在 `.env.local` 中添加：

   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
   ```

4. **发送限制（免费版）**  
   - 使用默认 `onboarding@resend.dev` 时，**只能发到你注册 Resend 时用的邮箱**  
   - 要发到任意邮箱，需要在 Resend 中添加并验证你自己的域名（Domains → Add Domain）

## 可选配置

```
RESEND_FROM_DOMAIN=onboarding@resend.dev   # 发件人邮箱，验证域名后可用 noreply@yourdomain.com
RESEND_FROM_NAME=Nexus                      # 发件人显示名称
```

## 常见错误

| 错误信息 | 原因 | 解决 |
|---------|------|------|
| Email service not configured | 未设置 RESEND_API_KEY | 在 .env.local 中添加密钥 |
| domain / from 相关错误 | 发件域名未验证 | 在 Resend 验证域名，或仅发到你的 Resend 账号邮箱 |
| Failed to send invite | 网络或 Resend API 异常 | 检查网络，或查看 Resend Dashboard 的 Logs |

## 与登录/忘记密码的对比

- **登录发邮件**：通常用 NextAuth 的 EmailProvider + Resend/Nodemailer，或第三方如 SendGrid
- **忘记密码**：同样调用 Resend/SendGrid 等 API 发重置链接
- **邀请邮件**：本项目在 `/api/invite-email` 中直接调用 Resend API，流程一致
