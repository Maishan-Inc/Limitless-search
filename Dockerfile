FROM node:20-alpine AS web-deps
WORKDIR /web
COPY web/limitless_search_web/package.json web/limitless_search_web/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS web-builder
WORKDIR /web
COPY --from=web-deps /web/node_modules ./node_modules
COPY web/limitless_search_web/ ./

ARG NEXT_PUBLIC_API_BASE=http://127.0.0.1:8888

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM --platform=$BUILDPLATFORM golang:1.24-alpine AS backend-builder
RUN apk add --no-cache git ca-certificates tzdata
WORKDIR /backend
COPY backend/limitless_search/go.mod backend/limitless_search/go.sum ./
RUN go mod download
COPY backend/limitless_search/ ./

ARG VERSION=dev
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown
ARG TARGETARCH

RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build -ldflags="-s -w -extldflags '-static'" -o /out/pansou .

FROM node:20-alpine AS runner
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app

RUN mkdir -p /app/cache /app/data/rankings /app/data/admin /app/web/.next

COPY --from=backend-builder /out/pansou /app/pansou
COPY --from=web-builder /web/public /app/web/public
COPY --from=web-builder /web/.next/standalone /app/web
COPY --from=web-builder /web/.next/static /app/web/.next/static
COPY --from=web-builder /web/bootstrap.js /app/web/bootstrap.js
COPY docker/start.sh /app/start.sh

RUN chmod +x /app/pansou /app/start.sh

ENV TZ=Asia/Shanghai \
    PORT=8888 \
    WEB_PORT=3200 \
    HOSTNAME=0.0.0.0 \
    NEXT_PUBLIC_API_BASE=http://127.0.0.1:8888 \
    NEXT_TELEMETRY_DISABLED=1

ARG VERSION=dev
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown

LABEL org.opencontainers.image.title="Limitless Search" \
      org.opencontainers.image.description="Limitless Search full-stack image" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.url="https://github.com/fish2018/pansou" \
      org.opencontainers.image.source="https://github.com/fish2018/pansou" \
      maintainer="fish2018"

EXPOSE 3200 8888

CMD ["/app/start.sh"]
