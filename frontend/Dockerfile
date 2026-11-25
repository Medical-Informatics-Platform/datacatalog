# Step 1: Build the Angular app
# Base images are pinned by digest; Dependabot bumps the digest when the tag is rebuilt.
FROM node:26.13.1-trixie@sha256:f8e5d4bb28fa55c74f1345166a082a10b7c68f22304350c1ce0d18358ae94996 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Step 2: Use Nginx to serve the Angular app
FROM nginx:1.31.10-alpine@sha256:7fc0fb4af7bf006aeb31aea88069976060f8f0a0a86b667126742cc17f4e31ae
COPY --chown=nginx:nginx docker-entrypoint.d/00-public-hostname.envsh /docker-entrypoint.d/00-public-hostname.envsh
COPY --chown=nginx:nginx nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build --chown=nginx:nginx /app/dist/datacatalog-frontend /usr/share/nginx/html

# The pinned nginx tag already has the brotli-libs fix, but not zlib 1.4-r0
# (CVE-2026-4738). Upgrade those packages by name instead of `apk upgrade`.
# Versions stay unpinned so the next Alpine revision still installs.
# hadolint ignore=DL3018
RUN chmod 755 /docker-entrypoint.d/00-public-hostname.envsh \
    && apk add --no-cache --upgrade brotli-libs zlib musl musl-utils \
    && chown -R nginx:nginx /var/cache/nginx /etc/nginx/conf.d \
    && install -o nginx -g nginx -m 0644 /dev/null /var/run/nginx.pid

# Default for compose on port 80. Helm and PUBLIC_HOST override this at start.
ENV PUBLIC_HOSTNAME=localhost
USER 101
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
