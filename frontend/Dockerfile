FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY shared ./shared
COPY frontend/package.json ./frontend/

# Install deps
RUN npm ci --workspace=frontend --include-workspace-root

# Build frontend
COPY frontend/ ./frontend/
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN cd frontend && npm run build

# --- Nginx image ---
FROM nginx:alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
