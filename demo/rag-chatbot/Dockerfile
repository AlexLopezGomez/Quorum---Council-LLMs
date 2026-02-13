FROM node:20-alpine

WORKDIR /app

# Copy SDK first for file dependency resolution
COPY sdk/ /sdk/

# Copy demo chatbot
COPY demo/rag-chatbot/package*.json ./

# Rewrite file dependency to /sdk for Docker context
RUN sed -i 's|file:../../sdk|file:/sdk|g' package.json && npm install

COPY demo/rag-chatbot/ .

EXPOSE 4000

CMD ["node", "server.js"]
