# Step 1: Build the Angular app
FROM node:24.21.0-trixie AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Step 2: Use Nginx to serve the Angular app
FROM nginx:1.31.5-alpine
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist/datacatalog-frontend /usr/share/nginx/html

RUN chown -R nginx:nginx /var/cache/nginx /etc/nginx/conf.d \
    && install -o nginx -g nginx -m 0644 /dev/null /var/run/nginx.pid

USER nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
