FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY shared/ shared/
COPY services/map-activities/ services/map-activities/

RUN printf 'go 1.22\nuse (\n\t./shared\n\t./services/map-activities\n)\n' > go.work && \
    cd services/map-activities && go build -o /map_activities ./cmd/...

FROM alpine:3.19
COPY --from=builder /map_activities /map_activities
ENTRYPOINT ["/map_activities"]
