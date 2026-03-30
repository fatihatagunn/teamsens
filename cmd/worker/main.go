package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/fatihatagunn/teamsens/internal/tasks"
)

// Worker process — only runs in development (TASK_DRIVER=asynq).
// In production Cloud Tasks handles job dispatch; this binary is not deployed.
func main() {
	worker := tasks.NewAsynqWorker()

	if err := worker.Start(); err != nil {
		log.Fatalf("worker start failed: %v", err)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	worker.Shutdown()
}
