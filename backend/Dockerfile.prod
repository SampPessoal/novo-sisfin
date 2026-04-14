FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY shared ./shared
COPY backend/package.json ./backend/

# Install all deps (workspace mode)
RUN npm ci --workspace=backend --include-workspace-root --ignore-scripts

# Generate Prisma
COPY backend/prisma ./backend/prisma
RUN cd backend && npx prisma generate

# Build backend
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
RUN cd backend && npx tsc

# --- Production image ---
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend_modules
COPY --from=builder /app/backend/prisma ./prisma
COPY backend/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
