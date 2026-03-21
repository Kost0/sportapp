FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY shared/ shared/
COPY services/auth/ services/auth/

RUN printf 'go 1.22\nuse (\n\t./shared\n\t./services/auth\n)\n' > go.work && \
    cd services/auth && go build -o /auth ./cmd/...

FROM alpine:3.19
COPY --from=builder /auth /auth
ENTRYPOINT ["/auth"]
