# Step 1: Build the Angular app
# Base images are pinned by digest; Dependabot bumps the digest when the tag is rebuilt.
FROM node:26.12.0-trixie@sha256:45a2bf9d9300e9cf47ecb375e38447c140c45ef5fbae869c430475b05b98d86e AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Step 2: Use Nginx to serve the Angular app
FROM nginx:1.31.8-alpine@sha256:785835ea65db4bba6f021acc0f3be91b0fef76a53fe41f8588c6698d2aed0606
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
