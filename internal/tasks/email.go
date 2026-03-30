package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"net/smtp"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// RegisterInternalTaskHandlers mounts the internal HTTP handlers that
// Cloud Tasks (or Asynq) calls to execute background jobs.
// These routes should NOT be publicly accessible — Cloud Run's ingress
// rules or a middleware that checks the X-CloudTasks-TaskName header
// should guard them.
func RegisterInternalTaskHandlers(r fiber.Router) {
	g := r.Group("/internal/tasks")
	g.Post("/email", handleEmailTask)
}

func handleEmailTask(c *fiber.Ctx) error {
	var payload EmailPayload
	if err := json.Unmarshal(c.Body(), &payload); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid email payload")
	}

	ctx := c.Context()
	if err := sendEmail(ctx, payload); err != nil {
		// Return 500 so Cloud Tasks retries the job
		return fiber.NewError(fiber.StatusInternalServerError, "failed to send email: "+err.Error())
	}
	return c.SendStatus(fiber.StatusOK)
}

// sendEmail sends an email via SMTP.
// Required env vars:
//
//	SMTP_HOST  (e.g. "smtp.gmail.com")
//	SMTP_PORT  (e.g. "587")
//	SMTP_USER
//	SMTP_PASS
//	EMAIL_FROM
func sendEmail(_ context.Context, p EmailPayload) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("EMAIL_FROM")

	if host == "" || port == "" || user == "" || pass == "" {
		return fmt.Errorf("SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS are required")
	}
	if from == "" {
		from = user
	}

	auth := smtp.PlainAuth("", user, pass, host)

	headers := strings.Join([]string{
		"From: " + from,
		"To: " + p.To,
		"Subject: " + p.Subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
	}, "\r\n")

	msg := []byte(headers + "\r\n\r\n" + p.Body)

	addr := host + ":" + port
	if err := smtp.SendMail(addr, auth, user, []string{p.To}, msg); err != nil {
		return fmt.Errorf("smtp.SendMail: %w", err)
	}
	return nil
}
