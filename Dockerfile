FROM node:20-alpine

WORKDIR /app

COPY bot/package*.json ./
RUN npm install --production

COPY bot/src ./src

# node:20-alpine already has a 'node' user (uid=1000)
USER node

EXPOSE 7860

CMD ["node", "src/index.js"]
