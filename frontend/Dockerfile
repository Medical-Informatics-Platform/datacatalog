# Step 1: Build the Angular app
# Base images are pinned by digest; Dependabot bumps the digest when the tag is rebuilt.
FROM node:26.12.1-trixie@sha256:97fa0f1b59035c6072721a88d55be1371c7cb1cc942b521e1cc5c72ec87655f4 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Step 2: Use Nginx to serve the Angular app
FROM nginx:1.31.8-alpine@sha256:713fc2ebfd92e8217db451477182ee91944b123d2b1ee9fd5a8c6e91ca6c3a11
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
