FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY shared/ shared/
COPY services/user-info/ services/user-info/

RUN printf 'go 1.22\nuse (\n\t./shared\n\t./services/user-info\n)\n' > go.work && \
    cd services/user-info && go build -o /user_info ./cmd/...

FROM alpine:3.19
COPY --from=builder /user_info /user_info
ENTRYPOINT ["/user_info"]
