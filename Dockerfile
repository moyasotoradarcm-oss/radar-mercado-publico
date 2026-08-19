FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar todas las dependencias
RUN npm ci || npm install

# Copiar el resto del código del proyecto
COPY . .

# Compilar tanto el cliente (Vite) como el servidor (esbuild)
RUN npm run build

# Exponer el puerto por defecto
ENV PORT=8080
EXPOSE 8080

# Comando para iniciar el servidor compilado
CMD ["node", "dist/server.cjs"]
