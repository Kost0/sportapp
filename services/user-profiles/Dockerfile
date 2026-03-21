FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY shared/ shared/
COPY services/user-profiles/ services/user-profiles/

RUN printf 'go 1.22\nuse (\n\t./shared\n\t./services/user-profiles\n)\n' > go.work && \
    cd services/user-profiles && go build -o /user_profiles ./cmd/...

FROM alpine:3.19
COPY --from=builder /user_profiles /user_profiles
ENTRYPOINT ["/user_profiles"]
