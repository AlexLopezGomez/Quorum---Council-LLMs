FROM node:20.19.1-alpine3.21@sha256:b18325f01afbb59e65e32609c3337f46358ebcb13784103e6d4e41cee6180fa0 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:20.19.1-alpine3.21@sha256:b18325f01afbb59e65e32609c3337f46358ebcb13784103e6d4e41cee6180fa0 AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

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
