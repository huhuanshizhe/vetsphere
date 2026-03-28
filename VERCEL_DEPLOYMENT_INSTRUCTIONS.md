# Vercel 部署配置说明

## ✅ 环境变量已完成配置

所有必需的环境变量已通过 Vercel CLI 成功添加到 **vetsphere-intl** 项目:

### 已配置的 20 个环境变量:

#### Supabase (3 个)
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

#### App Configuration (4 个)
- ✅ `NEXT_PUBLIC_APP_URL` = `https://vetsphere.net`
- ✅ `NEXT_PUBLIC_STORAGE_PREFIX` = `vetsphere_intl_`
- ✅ `NEXT_PUBLIC_DOMAIN` = `vetsphere.net`
- ✅ `NEXT_PUBLIC_CONTACT_EMAIL` = `support@vetsphere.net`

#### Stripe (3 个)
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Live Key)
- ✅ `STRIPE_SECRET_KEY` (Live Key)
- ✅ `STRIPE_WEBHOOK_SECRET`

#### Airwallex (3 个)
- ✅ `AIRWALLEX_HOST` = `https://api.airwallex.com`
- ✅ `AIRWALLEX_CLIENT_ID` = `xxx` (需要更新)
- ✅ `AIRWALLEX_API_KEY` = `xxx` (需要更新)

#### PayPal (2 个)
- ✅ `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- ✅ `PAYPAL_CLIENT_SECRET`

#### Email & AI (3 个)
- ✅ `RESEND_API_KEY`
- ✅ `AI_API_KEY`
- ✅ `AI_BASE_URL`
- ✅ `AI_MODEL`

#### Database (2 个)
- ✅ `DATABASE_URL`
- ✅ `STRIPE_SECRET_KEY`

---

## 🚀 部署步骤

### 方式一：通过 Vercel 仪表板 (推荐)

1. **访问 Vercel 项目**
   - 打开 https://vercel.com/adrians-projects-ca577ff4/vetsphere-intl

2. **检查环境变量**
   - 点击 **Settings** → **Environment Variables**
   - 确认所有 20 个变量都已列出

3. **重新部署**
   - 点击 **Deployments** 标签
   - 找到最新的部署
   - 点击 **⋯** 菜单
   - 选择 **Redeploy**

4. **验证部署**
   - 等待部署完成 (约 2-5 分钟)
   - 访问生产 URL: https://vetsphere.net

### 方式二：通过 GitHub 自动部署

1. **推送到 GitHub**
   ```bash
   cd e:\连川科技\vetsphere
   git push origin main
   ```

2. **Vercel 会自动检测并部署**
   - 访问 https://vercel.com/adrians-projects-ca577ff4/vetsphere-intl 查看部署进度

---

## ⚠️ 重要注意事项

### 1. 构建命令配置

Vercel 项目需要正确的构建设置。请确保在 Vercel 仪表板中配置:

**Settings** → **Build & Development Settings**:

- **Framework Preset**: Next.js
- **Root Directory**: `apps/intl`
- **Build Command**: `cd ../.. && pnpm run build:intl`
- **Output Directory**: `apps/intl/.next`
- **Install Command**: `pnpm install`

### 2. Airwallex 配置

当前 Airwallex 配置为占位符值:
- `AIRWALLEX_CLIENT_ID` = `xxx`
- `AIRWALLEX_API_KEY` = `xxx`

**需要更新为实际值**:
1. 登录 Airwallex 商户后台
2. 获取 API 凭证
3. 在 Vercel 仪表板更新环境变量

### 3. 多应用项目结构

本项目是 Monorepo 结构，Vercel 需要知道构建哪个应用:

- **vetsphere-intl**: `apps/intl`
- **vetsphere-cn**: `apps/cn`
- **vetsphere-admin**: `apps/admin`
- **vetsphere-edu**: `apps/edu-partner`
- **vetsphere-gear**: `apps/gear-partner`

每个 Vercel 项目需要单独配置 Root Directory 和构建命令。

---

## 🔧 故障排查

### 部署失败？

1. **检查构建日志**
   - 访问 Vercel Deployments 页面
   - 点击失败的部署
   - 查看 Build Logs

2. **常见问题**
   - ❌ 缺少环境变量 → 检查是否所有 20 个变量都已添加
   - ❌ 构建命令错误 → 确认 Root Directory 设置正确
   - ❌ 依赖安装失败 → 检查 pnpm-lock.yaml 是否已提交

### 环境变量不生效？

环境变量在部署时注入，需要:
1. 添加/修改环境变量
2. **重新部署** (Redeploy) 才能生效

### 本地测试部署？

```bash
# 安装 Vercel CLI
npm i -g vercel

# 拉取环境变量到本地
cd apps/intl
vercel env pull

# 本地运行测试
cd ../..
npm run dev:intl
```

---

## 📚 相关文档

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Deployment](https://vercel.com/docs/concepts/deployments)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)

---

**配置完成时间**: 2026-03-28  
**项目**: vetsphere-intl  
**生产 URL**: https://vetsphere.net
