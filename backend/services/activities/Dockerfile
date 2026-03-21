FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY shared/ shared/
COPY services/activities/ services/activities/

RUN printf 'go 1.22\nuse (\n\t./shared\n\t./services/activities\n)\n' > go.work && \
    cd services/activities && go build -o /activities ./cmd/...

FROM alpine:3.19
COPY --from=builder /activities /activities
ENTRYPOINT ["/activities"]
