# Build stage: compile the React app.
FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Empty by default: the browser calls /api/... on the same origin, and nginx forwards it to the API.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# Serve stage: nginx serves the static build and proxies the API.
FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Run nginx as the unprivileged nginx user: give it the directories it writes to
# and allow the binary to bind port 80 without root.
RUN apk add --no-cache libcap \
    && setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx \
    && apk del libcap \
    && touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/cache/nginx /var/run/nginx.pid /etc/nginx/conf.d /usr/share/nginx/html

USER nginx

EXPOSE 80
