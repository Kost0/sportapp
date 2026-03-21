FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY shared/ shared/
COPY services/activity-ops/ services/activity-ops/

RUN printf 'go 1.22\nuse (\n\t./shared\n\t./services/activity-ops\n)\n' > go.work && \
    cd services/activity-ops && go build -o /activity_ops ./cmd/...

FROM alpine:3.19
COPY --from=builder /activity_ops /activity_ops
ENTRYPOINT ["/activity_ops"]
