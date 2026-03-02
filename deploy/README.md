# VetSphere 部署指南

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (80/443)                        │
│                      反向代理 + SSL 终止                      │
└─────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │   CN    │   │  INTL   │   │  Admin  │   │  Gear   │
   │  :3001  │   │  :3002  │   │  :3003  │   │  :3004  │
   └─────────┘   └─────────┘   └─────────┘   └─────────┘
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    Supabase     │
                    │   (PostgreSQL)  │
                    └─────────────────┘
```

## 端口分配

| 服务 | 容器端口 | 主机端口 | 域名 |
|------|----------|----------|------|
| CN 中文站 | 3000 | 3001 | cn.vetsphere.com |
| INTL 国际站 | 3000 | 3002 | intl.vetsphere.com |
| Admin 管理后台 | 3000 | 3003 | admin.vetsphere.com |
| Gear Partner | 3000 | 3004 | gear.vetsphere.com |
| Nginx | 80/443 | 80/443 | - |

## 快速部署

### 1. 准备环境

```bash
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 重新登录以应用 docker 组权限
```

### 2. 克隆代码

```bash
git clone https://github.com/your-org/vetsphere.git
cd vetsphere
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp deploy/.env.example .env

# 编辑配置
nano .env
```

### 4. 配置 SSL 证书

```bash
# 创建证书目录
mkdir -p deploy/nginx/ssl/{cn,intl,admin,gear}.vetsphere.com

# 方式一：使用 Let's Encrypt (推荐)
# 先注释掉 nginx 配置中的 SSL 部分，启动服务获取证书
docker-compose up -d nginx
certbot certonly --webroot -w /var/www/certbot \
  -d cn.vetsphere.com -d intl.vetsphere.com \
  -d admin.vetsphere.com -d gear.vetsphere.com

# 复制证书到对应目录
cp /etc/letsencrypt/live/cn.vetsphere.com/* deploy/nginx/ssl/cn.vetsphere.com/

# 方式二：使用已有证书
# 将 fullchain.pem 和 privkey.pem 放到对应目录
```

### 5. 构建镜像

```bash
# 构建所有镜像 (首次需要较长时间)
docker-compose build

# 或单独构建某个应用
docker-compose build vetsphere-cn
```

### 6. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f vetsphere-cn
```

## 常用命令

```bash
# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart vetsphere-cn

# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 重新构建并启动
docker-compose up -d --build

# 进入容器调试
docker exec -it vetsphere-cn sh

# 查看容器资源使用
docker stats
```

## 更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建镜像
docker-compose build

# 3. 滚动更新 (零停机)
docker-compose up -d --no-deps vetsphere-cn
docker-compose up -d --no-deps vetsphere-intl
docker-compose up -d --no-deps vetsphere-admin
docker-compose up -d --no-deps vetsphere-gear-partner

# 4. 清理旧镜像
docker image prune -f
```

## 单独部署某个应用

```bash
# 只构建和运行 CN 站
docker build -t vetsphere-cn -f apps/cn/Dockerfile .
docker run -d \
  --name vetsphere-cn \
  -p 3001:3000 \
  --env-file .env \
  vetsphere-cn
```

## 健康检查

```bash
# 检查服务健康状态
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health
curl http://localhost:3003
curl http://localhost:3004

# 通过 Nginx
curl https://cn.vetsphere.com/api/health
```

## 日志管理

```bash
# 查看 Nginx 访问日志
tail -f deploy/nginx/logs/access.log

# 查看 Nginx 错误日志
tail -f deploy/nginx/logs/error.log

# 容器日志位置
docker logs vetsphere-cn
```

## 故障排除

### 1. 容器无法启动

```bash
# 检查构建日志
docker-compose build --no-cache vetsphere-cn

# 检查容器日志
docker logs vetsphere-cn
```

### 2. 502 Bad Gateway

```bash
# 检查上游服务是否运行
docker-compose ps

# 检查 Nginx 配置
docker exec vetsphere-nginx nginx -t
```

### 3. SSL 证书问题

```bash
# 测试 SSL 配置
openssl s_client -connect cn.vetsphere.com:443

# 检查证书过期时间
openssl x509 -in deploy/nginx/ssl/cn.vetsphere.com/fullchain.pem -noout -dates
```

### 4. 内存不足

```bash
# 检查内存使用
docker stats --no-stream

# 限制容器内存 (在 docker-compose.yml 中添加)
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

## 备份策略

```bash
# 数据库备份 (Supabase Dashboard 或 pg_dump)
# 应用数据在 Supabase，无需本地备份

# Nginx 配置备份
tar -czf nginx-config-backup.tar.gz deploy/nginx/

# SSL 证书备份
tar -czf ssl-certs-backup.tar.gz deploy/nginx/ssl/
```

## 监控建议

1. **容器监控**: 使用 Portainer 或 Docker Dashboard
2. **应用监控**: 接入 Sentry 错误追踪
3. **性能监控**: 使用 Prometheus + Grafana
4. **日志管理**: 使用 ELK Stack 或 Loki

## 安全建议

1. 定期更新 Docker 镜像基础层
2. 使用非 root 用户运行容器 (已配置)
3. 启用防火墙，只开放 80/443 端口
4. 定期轮换 SSL 证书
5. Admin 后台启用 IP 白名单
