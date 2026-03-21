FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY shared/ shared/
COPY services/news-feed/ services/news-feed/

RUN printf 'go 1.22\nuse (\n\t./shared\n\t./services/news-feed\n)\n' > go.work && \
    cd services/news-feed && go build -o /news_feed ./cmd/...

FROM alpine:3.19
COPY --from=builder /news_feed /news_feed
ENTRYPOINT ["/news_feed"]
