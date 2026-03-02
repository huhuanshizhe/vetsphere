# ============================================
# VetSphere Gear Partner - 供应商后台 Dockerfile
# ============================================
# Build: docker build -t vetsphere-gear-partner -f apps/gear-partner/Dockerfile .
# Run:   docker run -p 3004:3000 --env-file .env.gear-partner vetsphere-gear-partner

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/gear-partner/package.json ./apps/gear-partner/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/gear-partner/node_modules ./apps/gear-partner/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build --workspace=apps/gear-partner

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/apps/gear-partner/public ./apps/gear-partner/public

# Set the correct permission for prerender cache
RUN mkdir -p ./apps/gear-partner/.next
RUN chown nextjs:nodejs ./apps/gear-partner/.next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/apps/gear-partner/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/gear-partner/.next/static ./apps/gear-partner/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "apps/gear-partner/server.js"]
