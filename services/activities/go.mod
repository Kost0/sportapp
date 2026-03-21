module sportapp/activities

go 1.22

require (
	github.com/google/uuid v1.6.0
	github.com/lib/pq v1.10.9
	github.com/twmb/franz-go v1.16.1
	sportapp/shared v0.0.0
)

replace sportapp/shared => ../../shared
