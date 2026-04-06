# ─────────────────────────────────────────────────────────────────
# Dockerfile — Loyiha uchun optimal Node.js muhiti 
# (Hugging Face Spaces va boshqa platformalar uchun)
# ─────────────────────────────────────────────────────────────────

# 1. Asosiy imidj (alpine versiya kichik va tezkor)
FROM node:20-alpine

# Env parametrlarini Docker ichiga joriy etish uchun qo'shimcha xavfsizlik (ixtiyoriy)
ENV NODE_ENV=production
ENV PORT=7860

# 2. Ishchi katalogni o'rnatish
WORKDIR /app

# 3. Paket fayllarni nusxalash (keshni optimallashtirish uchun alohida nusxalanadi)
# Bot ilovasi uchun
COPY bot/package*.json ./bot/

# 4. Faqat production-uzluksiz modullarni o'rnatish (npm audit va cache larni tozalash)
RUN cd bot && npm ci --only=production && npm cache clean --force

# 5. Qolgan manba kodlarini nusxalash (bot papkasi)
COPY bot/src ./bot/src/
COPY bot/data ./bot/data/

# 6. Uploads va SQLite (agar fayl tizimi saqlansa) kabi papkalar yaratish va ruxsat berish
RUN mkdir -p /app/bot/uploads /app/bot/data && \
    chown -R node:node /app

# 7. Oddiy va imtiyozsiz foydalanuvchiga o'tish (root emas, Xavfsizlik maqsadida)
USER node

# 8. Hugging Face talabiga ko'ra port (7860) ochiladi
EXPOSE 7860

# Botni ishga tushirish uchun yo'lni ko'rsatish
WORKDIR /app/bot
CMD ["node", "src/index.js"]
