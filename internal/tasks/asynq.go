package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/hibiken/asynq"
)

const TaskTypeEmail = "email:send"

type asynqDispatcher struct {
	client *asynq.Client
}

func newAsynqDispatcher() (*asynqDispatcher, error) {
	client := asynq.NewClient(redisOpt())
	return &asynqDispatcher{client: client}, nil
}

func (d *asynqDispatcher) EnqueueEmail(ctx context.Context, payload EmailPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal email payload: %w", err)
	}
	_, err = d.client.EnqueueContext(ctx, asynq.NewTask(TaskTypeEmail, data))
	if err != nil {
		return fmt.Errorf("asynq enqueue: %w", err)
	}
	return nil
}

func (d *asynqDispatcher) Close() error {
	return d.client.Close()
}

// redisOpt reads REDIS_ADDR from the environment.
// In Docker Compose the service name "redis" is used; locally "localhost:6379".
func redisOpt() asynq.RedisClientOpt {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}
	return asynq.RedisClientOpt{Addr: addr}
}
