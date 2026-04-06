FROM node:20-alpine

WORKDIR /app

COPY bot/package*.json ./
RUN npm install --production

COPY bot/src ./src

# Create uploads directory and give node user ownership
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 7860

CMD ["node", "src/index.js"]
