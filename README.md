Despliegue de Cometa Films en Docker y Producción
Este documento detalla el proceso de despliegue de la aplicación "Cometa Films" utilizando Docker tanto en local como en una instancia de AWS
Estructura del Proyecto
El proyecto está organizado en dos componentes principales:

Backend API (apip-peliculas-backend): API REST desarrollada con Node.js
Frontend (app-frontend-cometafilms): Aplicación Angular que consume la API

Requisitos Previos

Docker y Docker Compose instalados
Git para clonar los repositorios
Acceso a Internet para descargar las imágenes de Docker

Configuración del Entorno


1. Clonar los Repositorios

# Crear directorio principal
mkdir -p proyecto-final-forDocker
cd proyecto-final-forDocker

# Clonar el backend
mkdir -p app-peliculas-backend
cd app-peliculas-backend
git clone https://github.com/tu-usuario/apip-peliculas-backend.git
cd ..

# Clonar el frontend
mkdir -p app-peliculas-frontend
cd app-peliculas-frontend
git clone https://github.com/tu-usuario/app-frontend-cometafilms.git
cd ..

2. Configurar Variables de Entorno
Crear un archivo .env en el directorio raíz:

PORT=3000
JWT_SECRET=secreto_jwt
MONGODB_URI=mongodb+srv://usuario:password@tu_cluster.mongodb.net/base_de_datos
TMDB_API_KEY=clave_api_themoviedb
PAYPAL_CLIENT_ID=client_id_de_paypal
PAYPAL_CLIENT_SECRET=client_secret_de_paypal
FRONTEND_URL=http://tu_dominio_o_ip


3. Configurar Docker Compose

Crear archivo docker-compose.yml en el directorio principal "proyecto-final-forDocker"

version: '3'
services:
  backend:
    build:  ./app-peliculas-backend/apip-peliculas-backend
    ports:
      - "3000:3000"
    environment:
      - PORT=${PORT}
      - JWT_SECRET=${JWT_SECRET}
      - MONGODB_URI=${MONGODB_URI}
      - PAYPAL_CLIENT_ID=${PAYPAL_CLIENT_ID}
      - PAYPAL_CLIENT_SECRET=${PAYPAL_CLIENT_SECRET}
      - FRONTEND_URL=${FRONTEND_URL}
      - TMDB_API_KEY=${TMDB_API_KEY}
    restart: always
    container_name: cometa-backend
  frontend:
    build: ./app-peliculas-frontend/app-frontend-cometafilms
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
    container_name: cometa-frontend



4. Configuración de Dockerfiles

Backend Dockerfile
El Dockerfile del backend se encuentra en app-peliculas-backend/apip-peliculas-backend/Dockerfile:

FROM node:18

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Copiar archivos de dependencias DESDE LA SUBCARPETA
COPY cometa-films-backend/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente DESDE LA SUBCARPETA
COPY cometa-films-backend/ .

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la aplicación con la ruta correcta
CMD ["node", "src/server.js"] 


Frontend Dockerfile
El Dockerfile del frontend se encuentra en app-peliculas-frontend/app-frontend-cometafilms/dockerfile:

# Etapa de construcción
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Aumentar el límite de memoria para Node.js
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Modificar el archivo environment.ts antes de la compilación para usar rutas relativas
RUN find /app/src -type f -name "*.ts" -exec sed -i 's|http://localhost:3000|/api|g' {} \; || true
# Construir para producción
RUN npm run build

# Etapa de producción
FROM nginx:alpine
# Copiar los archivos compilados al directorio html
COPY --from=build /app/dist/ /usr/share/nginx/html/
# Asegurarnos de que cualquier URL de backend que quede se cambie a /api
RUN find /usr/share/nginx/html -type f -name "*.js" -exec sed -i 's|http://localhost:3000|/api|g' {} \; || true
RUN find /usr/share/nginx/html -type f -name "*.js" -exec sed -i 's|"http://backend:3000|"/api|g' {} \; || true
RUN find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|'http://backend:3000|'/api|g" {} \; || true
# Configurar Nginx para servir desde el directorio browser y con proxy inverso al backend
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html/browser; \
    index index.html; \
    \
    # Configuración para la aplicación Angular \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Proxy inverso para el backend \
    location /api/ { \
        proxy_pass http://backend:3000/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
        proxy_redirect off; \
    } \
}' > /etc/nginx/conf.d/default.conf
# Eliminar cualquier index.html predeterminado que pueda interferir
RUN rm -f /usr/share/nginx/html/index.html || true
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


Despliegue en Desarrollo Local
Para desplegar en un entorno de desarrollo local:

# Iniciar los servicios
docker-compose up -d

# Ver los logs
docker-compose logs -f

# Acceder a la aplicación
# Frontend: http://localhost
# Backend API: http://localhost:3000


Despliegue en Producción

1. Preparar el Servidor (ec2 unbuntu server t2.small)

# Actualizar el sistema
sudo apt update
sudo apt upgrade -y

# Instalar Docker y Docker Compose
sudo apt install -y docker.io docker-compose

# Añadir usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

2. Clonar y Configurar el Proyecto
Seguir los mismos pasos de la sección "Configuración del Entorno" pero asegurándose de:

Actualizar la variable FRONTEND_URL en el archivo .env con la IP o dominio del servidor
Configurar los grupos de seguridad de AWS EC2 (o firewall equivalente) para permitir el tráfico en los puertos 80 (HTTP) y 3000 (API)

3. Construir y Desplegar

# Construir e iniciar los contenedores
cd ~/proyecto-final-forDocker
docker-compose up -d --build

# Verificar el estado de los contenedores
docker ps

5. Mantenimiento y actualizaciones

# Actualizar el código
cd ~/proyecto-final-forDocker
git -C app-peliculas-backend/apip-peliculas-backend pull
git -C app-peliculas-frontend/app-frontend-cometafilms pull

# Reconstruir los contenedores
docker-compose down
docker-compose up -d --build


