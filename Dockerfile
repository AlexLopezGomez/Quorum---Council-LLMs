FROM alpine:3.23 AS frontend-builder
RUN apk upgrade --no-cache && apk add --no-cache nodejs npm
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM alpine:3.23 AS backend-deps
RUN apk upgrade --no-cache && apk add --no-cache nodejs npm
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Pin by digest: docker pull gcr.io/distroless/nodejs20-debian12 && docker inspect --format='{{index .RepoDigests 0}}' gcr.io/distroless/nodejs20-debian12
FROM gcr.io/distroless/nodejs20-debian12

WORKDIR /app/backend

COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY --chown=nonroot:nonroot backend/ .

# staticServe.js resolves __dirname/../../../frontend/dist = /app/frontend/dist
COPY --from=frontend-builder --chown=nonroot:nonroot /app/frontend/dist /app/frontend/dist

USER nonroot

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

CMD ["src/index.js"]
