module sportapp/user-profiles

go 1.22

require (
	github.com/lib/pq v1.10.9
	github.com/twmb/franz-go v1.16.1
	sportapp/shared v0.0.0
)

require (
	github.com/DATA-DOG/go-sqlmock v1.5.2
	github.com/klauspost/compress v1.17.4 // indirect
	github.com/pierrec/lz4/v4 v4.1.19 // indirect
	github.com/twmb/franz-go/pkg/kmsg v1.7.0 // indirect
)

replace sportapp/shared => ./../../shared
