FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Final image (served by backend Express static) ──
# The dist/ folder is copied into the backend container at build time
# via docker-compose volumes or multi-stage approach.
# This stage is used standalone only during development.
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
