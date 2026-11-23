# Multi-Stage Production Dockerfile for Student Mapping GIS System
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy application source code
COPY . .

# Type-check and build Vite frontend + esbuild server bundle
RUN npx tsc --noEmit --incremental false && npm run build

# ------------------------------------------------------------------------------
# Production Runtime Stage (minimal, non-root)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy only compiled artifacts and required runtime assets (do NOT overwrite node_modules)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server/data ./server/data

# Prepare upload directory owned by non-root user
RUN mkdir -p /app/server/uploads && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/ready || exit 1

CMD ["node", "dist/index.cjs"]
