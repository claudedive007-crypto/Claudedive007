FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate

EXPOSE 4000
# migrate + seed on every start: cheap, and guarantees a clean, known demo state
# (the seed script truncates first) every time you run `docker compose up`.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && npm run dev"]
