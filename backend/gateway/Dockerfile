FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY shared/ shared/
COPY gateway/ gateway/

RUN printf 'go 1.22\nuse (\n\t./shared\n\t./gateway\n)\n' > go.work && \
    cd gateway && go build -o /gateway ./...

FROM alpine:3.19
COPY --from=builder /gateway /gateway
ENTRYPOINT ["/gateway"]
