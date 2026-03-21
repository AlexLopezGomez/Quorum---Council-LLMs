FROM alpine:3.23 AS builder
RUN apk upgrade --no-cache && apk add --no-cache nodejs-20 npm

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM alpine:3.23
RUN apk upgrade --no-cache && apk add --no-cache nodejs-20

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
