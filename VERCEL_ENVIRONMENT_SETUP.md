# Vercel 环境变量配置指南

## 📋 概述

本项目使用 Vercel 进行部署，所有环境变量需要在 Vercel 平台配置，**不要**将 `.env` 文件提交到 GitHub。

## 🔧 配置步骤

### 1. 访问 Vercel 项目设置

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择 `vetsphere` 项目
3. 点击 **Settings** 标签
4. 选择左侧菜单的 **Environment Variables**

### 2. 添加环境变量

为每个环境 (Production, Preview, Development) 添加以下变量:

#### 🔑 核心配置 (所有环境都需要)

| Variable Name | Production Value | Preview/Development Value |
|---------------|------------------|---------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-production-project.supabase.co` | `https://your-preview-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 从 Supabase 项目设置获取 | 从 Supabase 项目设置获取 |
| `SUPABASE_SERVICE_ROLE_KEY` | 从 Supabase 项目设置获取 | 从 Supabase 项目设置获取 |
| `NEXT_PUBLIC_APP_URL` | `https://vetsphere.net` | `http://localhost:3001` |
| `NEXT_PUBLIC_STORAGE_PREFIX` | `vetsphere_intl_` | `vetsphere_intl_` |
| `NEXT_PUBLIC_DOMAIN` | `vetsphere.net` | `localhost` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `support@vetsphere.net` | `support@vetsphere.net` |

#### 💳 支付配置

| Variable Name | Value | 获取方式 |
|---------------|-------|----------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxx` (生产) / `pk_test_xxx` (测试) | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_SECRET_KEY` | `sk_live_xxx` (生产) / `sk_test_xxx` (测试) | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` | Stripe Dashboard → Developers → Webhooks |
| `AIRWALLEX_HOST` | `https://api.airwallex.com` | Airwallex 文档 |
| `AIRWALLEX_CLIENT_ID` | 您的 Client ID | Airwallex 商户后台 |
| `AIRWALLEX_API_KEY` | 您的 API Key | Airwallex 商户后台 |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal Client ID | [PayPal Developer](https://developer.paypal.com/) |
| `PAYPAL_CLIENT_SECRET` | PayPal Client Secret | PayPal Developer |

#### 📧 邮件服务

| Variable Name | Value | 获取方式 |
|---------------|-------|----------|
| `RESEND_API_KEY` | `re_xxx` | [Resend Console](https://resend.com/api-keys) |

#### 🤖 AI 服务

| Variable Name | Value | 获取方式 |
|---------------|-------|----------|
| `AI_API_KEY` | `sk-xxx` | [DashScope](https://dashscope.console.aliyun.com/) |
| `AI_BASE_URL` | `https://coding.dashscope.aliyuncs.com/v1` | DashScope 文档 |
| `AI_MODEL` | `qwen3.5-plus` | DashScope 模型列表 |

### 3. 环境变量作用域设置

在 Vercel 中添加变量时，选择作用域:

- ✅ **Production**: 生产环境部署
- ✅ **Preview**: Preview 部署 (pull request)
- ✅ **Development**: 本地开发 (`vercel dev`)

### 4. 重新部署

添加完环境变量后:

1. 进入 Vercel 项目的 **Deployments** 标签
2. 找到最新的部署
3. 点击 **⋯** 菜单
4. 选择 **Redeploy**

## 🚀 快速配置脚本

使用 Vercel CLI 快速导入环境变量:

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 进入项目目录
cd apps/intl

# 导入环境变量 (从本地 .env.example)
vercel env pull
```

## 📝 多应用配置

本项目有多个应用，每个应用的环境变量可能不同:

| 应用 | Vercel 项目 | 端口 | 说明 |
|------|------------|------|------|
| `apps/intl` | vetsphere-intl | 3001 | 国际站主应用 |
| `apps/cn` | vetsphere-cn | 3000 | 中国站 |
| `apps/admin` | vetsphere-admin | 3002 | 管理后台 |
| `apps/edu-partner` | vetsphere-edu | 3003 | 教育合作伙伴 |
| `apps/gear-partner` | vetsphere-gear | 3004 | 设备合作伙伴 |

**注意**: 每个 Vercel 项目需要单独配置环境变量。

## 🔒 安全最佳实践

1. ✅ **永远不要**将 `.env` 文件提交到 Git (已在 `.gitignore` 中排除)
2. ✅ 使用 Vercel 的加密环境变量
3. ✅ 生产环境使用 `live_` 密钥，测试环境使用 `test_` 密钥
4. ✅ 定期轮换 API 密钥
5. ✅ 使用 Webhook 签名验证

## 🆘 故障排查

### 环境变量不生效?

1. 确认变量名正确 (区分大小写)
2. 确认选择了正确的环境 (Production/Preview/Development)
3. 重新部署项目 (环境变量在部署时注入)

### 本地开发如何测试?

```bash
# 复制环境变量
cp apps/intl/.env.example apps/intl/.env.local

# 编辑 .env.local 填入实际值
# 然后运行
npm run dev
```

## 📚 参考文档

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase API Keys](https://supabase.com/docs/guides/api)
- [Stripe API Keys](https://stripe.com/docs/keys)

---

**最后更新**: 2026-03-28  
**项目**: VetSphere International
