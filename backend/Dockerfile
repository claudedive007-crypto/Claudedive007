FROM node:22-slim
WORKDIR /app

# Prisma's query engine needs OpenSSL, which isn't in the slim base image.
# (node:22-alpine also fails here — its musl libc build of the engine crashes
# on startup with a non-JSON error that Prisma then fails to parse.)
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate

EXPOSE 4000
# migrate + seed on every start: cheap, and guarantees a clean, known demo state
# (the seed script truncates first) every time you run `docker compose up`.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && npm run dev"]
