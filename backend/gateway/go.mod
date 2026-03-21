module sportapp/gateway

go 1.22

require (
	github.com/golang-jwt/jwt/v5 v5.2.1
	sportapp/shared v0.0.0
)

replace sportapp/shared => ./../shared
