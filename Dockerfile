# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Do NOT install libc6-compat - it breaks Prisma on Alpine
# Prisma uses musl-compiled binaries on Alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy prisma files for migrations
COPY --from=builder /app/prisma ./prisma

# Copy generated prisma client
COPY --from=builder /app/src/generated ./src/generated

# Copy prisma dependencies for migrations
COPY --from=builder /app/node_modules ./node_modules

# Copy entrypoint script
COPY --from=builder /app/scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "./entrypoint.sh"]
