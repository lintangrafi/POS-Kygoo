# =====================================================
# Dockerfile - POS Kygoo (Next.js Standalone)
# Multi-stage build
# =====================================================

# Stage 1: Install dependencies & build
FROM node:20-slim AS builder
WORKDIR /app

# Install build essentials for native modules
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends     python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Workaround for npm bug #4828 - @tailwindcss/oxide native binary
RUN npm install --no-save @tailwindcss/oxide-linux-x64-gnu

# Copy source code
COPY . .

# Ensure public/ exists (Next.js standalone needs it even if empty)
RUN mkdir -p public

# Build Next.js
RUN npm run build

# Stage 2: Production image
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install required runtime deps
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends     openssl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs &&     adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./

# Copy static assets
COPY --from=builder /app/.next/static ./.next/static

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
