package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/fatihatagunn/teamsens/internal/firebase"
	"github.com/fatihatagunn/teamsens/internal/google"
	"github.com/fatihatagunn/teamsens/internal/handlers"
	"github.com/fatihatagunn/teamsens/internal/middleware"
	"github.com/fatihatagunn/teamsens/internal/tasks"
)

func main() {
	ctx := context.Background()

	// Initialize Firebase (Firestore + Auth)
	fb, err := firebase.NewClient(ctx)
	if err != nil {
		log.Fatalf("firebase init failed: %v", err)
	}
	defer fb.Close()

	// Initialize Google Calendar service
	calSvc, err := google.NewCalendarService(ctx)
	if err != nil {
		log.Fatalf("google calendar init failed: %v", err)
	}

	// Initialize task dispatcher (Cloud Tasks or Asynq depending on TASK_DRIVER)
	dispatcher, err := tasks.NewDispatcher(ctx)
	if err != nil {
		log.Fatalf("task dispatcher init failed: %v", err)
	}
	defer dispatcher.Close()

	// Build Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "TeamSens API",
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		ErrorHandler: errorHandler,
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins(),
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
	}))
	app.Use(compress.New())

	// Register API routes
	api := app.Group("/api/v1")
	handlers.RegisterHealth(api)

	// Protected routes — require a valid Firebase ID token
	protected := api.Group("", middleware.FirebaseAuth(fb))
	handlers.RegisterTasks(protected, fb.Firestore)
	handlers.RegisterMeetings(protected, fb.Firestore, calSvc)
	handlers.RegisterPartners(protected, fb.Firestore, dispatcher)

	// Serve Next.js static export — must be last
	app.Static("/", "./static", fiber.Static{
		Compress:  true,
		ByteRange: true,
		Browse:    false,
		Index:     "index.html",
	})

	// SPA fallback: unknown paths → index.html
	app.Use(func(c *fiber.Ctx) error {
		return c.SendFile("./static/index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("TeamSens listening on :%s", port)
		if err := app.Listen(fmt.Sprintf(":%s", port)); err != nil {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-quit
	log.Println("shutting down…")
	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}

func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	var e *fiber.Error
	if errors.As(err, &e) {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"error": err.Error(),
	})
}

func allowedOrigins() string {
	if env := os.Getenv("ALLOWED_ORIGINS"); env != "" {
		return env
	}
	return "http://localhost:3000"
}
