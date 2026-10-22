# Stage 1: Build React 19 + Vite Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first for optimal Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy frontend source code
COPY . .

# Compile optimized static production build
RUN npm run build

# Stage 2: Serve static bundle via Nginx
FROM nginx:alpine

# Remove default Nginx HTML
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose standard web port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

