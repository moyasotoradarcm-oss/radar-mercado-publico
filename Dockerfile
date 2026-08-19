FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Compilar proyecto (Vite + esbuild)
RUN npm run build

# Puerto dinámico de Cloud Run
ENV PORT=8080
EXPOSE 8080

# Comando exacto de inicio
CMD ["node", "dist/server.cjs"]
