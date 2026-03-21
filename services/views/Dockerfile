FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY shared/ shared/
COPY services/views/ services/views/

RUN printf 'go 1.22\nuse (\n\t./shared\n\t./services/views\n)\n' > go.work && \
    cd services/views && go build -o /views ./cmd/...

FROM alpine:3.19
COPY --from=builder /views /views
ENTRYPOINT ["/views"]
