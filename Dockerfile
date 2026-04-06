FROM node:20-alpine

# Use an unprivileged user id 1000 for Hugging Face
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -S appuser

WORKDIR /app

# Copy files and adjust ownership
COPY --chown=appuser:appgroup bot/package*.json ./
RUN npm install --production

COPY --chown=appuser:appgroup bot/src ./src

# Switch to non-root
USER appuser

EXPOSE 7860

CMD ["node", "src/index.js"]
