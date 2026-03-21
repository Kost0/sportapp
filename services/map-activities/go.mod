module sportapp/map-activities

go 1.22

require (
	go.mongodb.org/mongo-driver v1.15.0
	github.com/twmb/franz-go v1.16.1
	sportapp/shared v0.0.0
)

replace sportapp/shared => ../../shared
