# =====================================================
# Dockerfile - POS Kygoo (Next.js Standalone)
# Multi-stage build: dev deps → build → production
# NOTE: Uses node:20-slim (NOT alpine) for Tailwind CSS v4 native bindings
# =====================================================

# Stage 1: Install dependencies & build
FROM node:20-slim AS builder
WORKDIR /app

# Install build essentials for native modules
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends     python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDeps for build)
RUN npm ci

# Copy source code
COPY . .

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
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy scripts needed for runtime
COPY --from=builder /app/scripts ./scripts

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
