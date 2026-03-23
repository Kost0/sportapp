package kafka

import (
	"context"
	"errors"
	"log"

	"github.com/twmb/franz-go/pkg/kgo"
)

type Handler func(data []byte) error

type Consumer struct {
	client  *kgo.Client
	handler Handler
}

func NewConsumer(brokers []string, topics []string, group string, handler Handler) (*Consumer, error) {
	if len(brokers) == 0 {
		return nil, errors.New("kafka: no brokers")
	}
	if len(topics) == 0 {
		return nil, errors.New("kafka: no topics")
	}
	if group == "" {
		return nil, errors.New("kafka: empty consumer group")
	}
	if handler == nil {
		return nil, errors.New("kafka: nil handler")
	}

	cl, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.ConsumerGroup(group),
		kgo.ConsumeTopics(topics...),
		kgo.AutoCommitMarks(),
		kgo.BlockRebalanceOnPoll(),
		kgo.OnPartitionsRevoked(func(ctx context.Context, cl *kgo.Client, _ map[string][]int32) {
			_ = cl.CommitMarkedOffsets(ctx)
		}),
	)
	if err != nil {
		return nil, err
	}

	return &Consumer{client: cl, handler: handler}, nil
}

func (c *Consumer) Run(ctx context.Context) {
	if c == nil || c.client == nil {
		return
	}

	for {
		fetches := c.client.PollFetches(ctx)
		if fetches.IsClientClosed() {
			return
		}
		if ctx.Err() != nil {
			return
		}

		if errs := fetches.Errors(); len(errs) > 0 {
			for _, e := range errs {
				log.Printf("kafka: fetch error topic=%s partition=%d: %v", e.Topic, e.Partition, e.Err)
			}
			c.client.AllowRebalance()
			continue
		}

		fetches.EachRecord(func(r *kgo.Record) {
			if err := c.handler(r.Value); err != nil {
				log.Printf("kafka: handler error topic=%s partition=%d offset=%d: %v", r.Topic, r.Partition, r.Offset, err)
				return
			}
			c.client.MarkCommitRecords(r)
		})

		if err := c.client.CommitMarkedOffsets(ctx); err != nil {
			log.Printf("kafka: commit error: %v", err)
		}

		c.client.AllowRebalance()
	}
}

func (c *Consumer) Close() {
	if c == nil || c.client == nil {
		return
	}
	c.client.Close()
}
