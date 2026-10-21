# Stage 1: Build Frontend Assets
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src/ ./src/

RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
