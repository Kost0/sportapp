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

replace sportapp/shared => ../../shared
