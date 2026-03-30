package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/hibiken/asynq"
)

// AsynqWorker processes background jobs from the Redis queue.
// It runs in the same process as the API server (separate goroutine).
type AsynqWorker struct {
	server *asynq.Server
}

// NewAsynqWorker creates the worker server. Only called when TASK_DRIVER=asynq.
func NewAsynqWorker() *AsynqWorker {
	srv := asynq.NewServer(
		redisOpt(),
		asynq.Config{
			Concurrency: 5,
			Queues:      map[string]int{"default": 1},
		},
	)
	return &AsynqWorker{server: srv}
}

// Start registers task handlers and begins processing. Non-blocking.
func (w *AsynqWorker) Start() error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TaskTypeEmail, processEmailTask)

	if err := w.server.Start(mux); err != nil {
		return fmt.Errorf("asynq worker start: %w", err)
	}
	log.Println("Asynq worker started")
	return nil
}

// Shutdown gracefully drains in-flight tasks.
func (w *AsynqWorker) Shutdown() {
	w.server.Shutdown()
	log.Println("Asynq worker stopped")
}

func processEmailTask(ctx context.Context, t *asynq.Task) error {
	var payload EmailPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("unmarshal email payload: %w", err)
	}
	return sendEmail(ctx, payload)
}
