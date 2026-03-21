module sportapp/news-collector

go 1.22

require (
	github.com/twmb/franz-go v1.16.1
	sportapp/shared v0.0.0
)

replace sportapp/shared => ../../shared
