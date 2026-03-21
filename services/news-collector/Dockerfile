FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY shared/ shared/
COPY services/news-collector/ services/news-collector/

RUN printf 'go 1.22\nuse (\n\t./shared\n\t./services/news-collector\n)\n' > go.work && \
    cd services/news-collector && go build -o /news_collector ./cmd/...

FROM alpine:3.19
COPY --from=builder /news_collector /news_collector
ENTRYPOINT ["/news_collector"]
