# Step 1: Build the Angular app
# Base images are pinned by tag, not digest: a digest pin would stop picking up
# the patched rebuilds published under the same tag.
# nosemgrep: dockerfile-source-not-pinned
FROM node:24.22.1-trixie AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Step 2: Use Nginx to serve the Angular app
# nosemgrep: dockerfile-source-not-pinned
FROM nginx:1.31.8-alpine
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist/datacatalog-frontend /usr/share/nginx/html

# Patch OS packages shipped in the base image until a rebuilt nginx tag carries the fixes
# nosemgrep: avoid-apk-upgrade
RUN apk upgrade --no-cache \
    && chown -R nginx:nginx /var/cache/nginx /etc/nginx/conf.d \
    && install -o nginx -g nginx -m 0644 /dev/null /var/run/nginx.pid

USER 101
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
