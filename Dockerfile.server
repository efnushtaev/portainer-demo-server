FROM node:18 AS builder
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git

WORKDIR /app
COPY server/package.json ./
COPY server/package-lock.json ./

RUN npm ci --include=dev

COPY server/ ./
RUN npm run build

# Используем node напрямую вместо npm start
# Финальный этап
FROM node:18-alpine AS production
WORKDIR /app
# Копируем только production зависимости
COPY server/package.json ./
COPY server/package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Копируем только собранное приложение из этапа builder
COPY --from=builder /app ./

# Копируем другие необходимые файлы (если нужны)
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/.env ./

EXPOSE 3001
# Указываем команду запуска
CMD ["node", "index.js"]