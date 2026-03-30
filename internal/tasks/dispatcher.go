package tasks

import (
	"context"
	"fmt"
	"os"
)

// EmailPayload contains all data needed to send an email.
type EmailPayload struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"` // HTML supported
}

// Dispatcher is the abstraction layer for background job queues.
// The default implementation uses Google Cloud Tasks.
// Swap to AsynqDispatcher (backed by Redis) without changing call sites.
type Dispatcher interface {
	EnqueueEmail(ctx context.Context, payload EmailPayload) error
	Close() error
}

// DriverType selects the underlying job queue implementation.
type DriverType string

const (
	DriverCloudTasks DriverType = "cloudtasks"
	DriverAsynq      DriverType = "asynq"
)

// NewDispatcher creates a Dispatcher using the TASK_DRIVER env var
// ("cloudtasks" | "asynq"). Defaults to "cloudtasks".
func NewDispatcher(ctx context.Context) (Dispatcher, error) {
	driver := DriverType(os.Getenv("TASK_DRIVER"))
	if driver == "" {
		driver = DriverCloudTasks
	}

	switch driver {
	case DriverCloudTasks:
		return newCloudTasksDispatcher(ctx)
	case DriverAsynq:
		return newAsynqDispatcher()
	default:
		return nil, fmt.Errorf("unknown TASK_DRIVER: %q (valid: cloudtasks, asynq)", driver)
	}
}
