package kafka

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/twmb/franz-go/pkg/kgo"
)

type Producer struct {
	client *kgo.Client
	topic  string
}

func NewProducer(brokers []string, topic string) (*Producer, error) {
	if len(brokers) == 0 {
		return nil, errors.New("kafka: no brokers")
	}
	if topic == "" {
		return nil, errors.New("kafka: empty topic")
	}

	cl, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.DefaultProduceTopic(topic),
	)
	if err != nil {
		return nil, err
	}

	return &Producer{client: cl, topic: topic}, nil
}

func (p *Producer) Publish(ctx context.Context, event interface{}) error {
	if p == nil || p.client == nil {
		return errors.New("kafka: producer not initialized")
	}

	b, err := json.Marshal(event)
	if err != nil {
		return err
	}

	rec := &kgo.Record{Topic: p.topic, Value: b}

	return p.client.ProduceSync(ctx, rec).FirstErr()
}

func (p *Producer) Close() {
	if p == nil || p.client == nil {
		return
	}
	p.client.Close()
}
