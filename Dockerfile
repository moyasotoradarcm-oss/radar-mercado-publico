FROM node:22-slim AS builder
WORKDIR /app
COPY . .
RUN npm install --include=dev
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package*.json ./
RUN npm install --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
