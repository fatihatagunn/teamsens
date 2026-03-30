package firebase

import (
	"context"
	"fmt"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

// Client wraps Firebase services used across the application.
type Client struct {
	Firestore *firestore.Client
	Auth      *auth.Client
	app       *firebase.App
}

// NewClient initialises Firebase using either a service account key file
// (GOOGLE_APPLICATION_CREDENTIALS env var) or the default application
// credentials when running on GCP (Cloud Run, GCE, etc.).
func NewClient(ctx context.Context) (*Client, error) {
	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		return nil, fmt.Errorf("GCP_PROJECT_ID environment variable is required")
	}

	cfg := &firebase.Config{ProjectID: projectID}

	var opts []option.ClientOption
	if keyPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"); keyPath != "" {
		opts = append(opts, option.WithCredentialsFile(keyPath))
	}

	app, err := firebase.NewApp(ctx, cfg, opts...)
	if err != nil {
		return nil, fmt.Errorf("firebase.NewApp: %w", err)
	}

	fs, err := app.Firestore(ctx)
	if err != nil {
		return nil, fmt.Errorf("app.Firestore: %w", err)
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		_ = fs.Close()
		return nil, fmt.Errorf("app.Auth: %w", err)
	}

	return &Client{
		Firestore: fs,
		Auth:      authClient,
		app:       app,
	}, nil
}

// Close releases all Firebase resources.
func (c *Client) Close() error {
	return c.Firestore.Close()
}
