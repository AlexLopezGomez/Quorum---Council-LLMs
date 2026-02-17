FROM node:20-alpine

# Copy SDK as a proper package
COPY sdk/ /sdk/

WORKDIR /app

# Copy package.json and rewrite SDK path for Docker context
COPY demo/rag-chatbot/package.json ./
RUN sed -i 's|file:../../sdk|file:/sdk|g' package.json

# Install dependencies with --install-links to copy (not symlink) file: deps
RUN npm install --install-links

# Copy application code
COPY demo/rag-chatbot/ .

EXPOSE 4000

CMD ["node", "server.js"]

