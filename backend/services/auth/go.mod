module sportapp/auth

go 1.22

require (
	github.com/golang-jwt/jwt/v5 v5.2.1
	github.com/google/uuid v1.6.0
	github.com/lib/pq v1.10.9
	github.com/twmb/franz-go v1.16.1
	golang.org/x/crypto v0.23.0
	sportapp/shared v0.0.0
)

require (
	github.com/klauspost/compress v1.17.4 // indirect
	github.com/pierrec/lz4/v4 v4.1.19 // indirect
	github.com/twmb/franz-go/pkg/kmsg v1.7.0 // indirect
)

replace sportapp/shared => ./../../shared
