FROM node:22-alpine AS builder

WORKDIR /app

COPY src/package.json src/package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

COPY src/ .
RUN npm run build

# Production image
FROM node:22-alpine

RUN apk add --no-cache git ripgrep curl

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

RUN npx prisma generate

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
