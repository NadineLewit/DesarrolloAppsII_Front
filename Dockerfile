FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=/api
ARG VITE_APP_ENV=container
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_ENV=$VITE_APP_ENV
RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
