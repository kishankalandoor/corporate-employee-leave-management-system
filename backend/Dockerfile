# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for native compilation (argon2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Stage 2: Production Runtime
FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4000

# Create dedicated non-root user
RUN groupadd -r nodejs && useradd -m -r -g nodejs nodejs

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts || npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Copy seed script and source needed for seeding
COPY --from=builder /app/package.json ./package.json

# Provide docker entrypoint script that runs seed if needed then starts server
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
