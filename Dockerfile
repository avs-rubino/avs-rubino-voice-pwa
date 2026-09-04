# Multi-stage build for Voice PWA (React + Vite)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Final minimal production image with unprivileged Nginx
FROM nginxinc/nginx-unprivileged:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
