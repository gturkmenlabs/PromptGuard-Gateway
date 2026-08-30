# ==============================================================================
# PromptGuard Gateway — Multi-Stage Enterprise Production Dockerfile
# ==============================================================================

# Stage 1: Build the React + TypeScript frontend portal
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm ci

# Copy full source and compile production bundle
COPY . .
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=9119
ENV HOST=0.0.0.0

# Install curl/wget for container health probes
RUN apk add --no-cache wget

# Copy production frontend distribution and static SDK
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Copy backend daemon and package definitions
COPY daemon ./daemon
COPY package*.json ./

RUN mkdir -p /home/node/.promptguard && chown -R node:node /home/node/.promptguard

# User isolation for enterprise container security
USER node

EXPOSE 9119
EXPOSE 9120

# Continuous Healthcheck Probe
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:9119/health || exit 1

# Start PromptGuard Local Gateway
CMD ["node", "daemon/server.mjs"]
