FROM alpine:3.23
RUN apk upgrade --no-cache && apk add --no-cache nodejs-20 npm

# Copy SDK as a proper package
COPY sdk/ /sdk/

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package.json and rewrite SDK path for Docker context
COPY demo/rag-chatbot/package.json ./
RUN sed -i 's|file:../../sdk|file:/sdk|g' package.json

# Install dependencies with --install-links to copy (not symlink) file: deps
RUN npm install --install-links

# Copy application code
COPY --chown=nodejs:nodejs demo/rag-chatbot/ .

USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/ || exit 1

CMD ["node", "server.js"]
