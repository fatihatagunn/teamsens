package handlers

import (
	"runtime"
	"time"

	"github.com/gofiber/fiber/v2"
)

var startTime = time.Now()

// RegisterHealth mounts the /health and /readyz endpoints.
func RegisterHealth(r fiber.Router) {
	r.Get("/health", handleHealth)
	r.Get("/readyz", handleReady)
}

func handleHealth(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "ok",
		"uptime":  time.Since(startTime).String(),
		"go":      runtime.Version(),
		"service": "teamsens-api",
	})
}

// handleReady is used as the Cloud Run liveness/readiness probe.
func handleReady(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusOK)
}
