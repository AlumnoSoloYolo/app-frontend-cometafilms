# Etapa de construcción
FROM node:16 AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Modificar el environment.ts para producción
RUN sed -i "s|http://localhost:3000|http://backend:3000|g" ./src/environments/environments.ts

RUN npm run build

# Etapa de producción
FROM nginx:alpine

# Copiar los archivos compilados desde la etapa de construcción
COPY --from=build /usr/src/app/dist/* /usr/share/nginx/html/

# Exponer puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]