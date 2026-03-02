# ============================================
# VetSphere INTL - 国际站 Dockerfile
# ============================================
# Build: docker build -t vetsphere-intl -f apps/intl/Dockerfile .
# Run:   docker run -p 3002:3000 --env-file .env.intl vetsphere-intl

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/intl/package.json ./apps/intl/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/intl/node_modules ./apps/intl/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build --workspace=apps/intl

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/apps/intl/public ./apps/intl/public

# Set the correct permission for prerender cache
RUN mkdir -p ./apps/intl/.next
RUN chown nextjs:nodejs ./apps/intl/.next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/apps/intl/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/intl/.next/static ./apps/intl/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "apps/intl/server.js"]
