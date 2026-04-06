FROM node:24-alpine

WORKDIR /usr/src/app

# Copy package files
COPY bot/package*.json ./

# Install dependencies (requires build tools for SQLite)
RUN apk add --no-cache python3 make g++ 
RUN npm install --production

# Copy application code
COPY bot/src ./src

# Expose API port
EXPOSE 3001

# Command to run
CMD ["node", "src/index.js"]
