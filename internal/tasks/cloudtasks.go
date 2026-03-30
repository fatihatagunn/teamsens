package tasks

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"golang.org/x/oauth2/google"
	"golang.org/x/oauth2"
)

const cloudTasksScope = "https://www.googleapis.com/auth/cloud-tasks"

// cloudTasksDispatcher enqueues jobs via the Cloud Tasks REST API v2.
// Uses application-default credentials — no extra SDK dependency needed.
//
// Required env vars:
//
//	GCP_PROJECT_ID
//	GCP_REGION         (e.g. "europe-west1")
//	CLOUDTASKS_QUEUE   (queue name, e.g. "email-queue")
//	TASK_HANDLER_URL   (the Cloud Run service base URL)
type cloudTasksDispatcher struct {
	httpClient *http.Client
	queuePath  string
	handlerURL string
}

func newCloudTasksDispatcher(ctx context.Context) (*cloudTasksDispatcher, error) {
	project := os.Getenv("GCP_PROJECT_ID")
	region := os.Getenv("GCP_REGION")
	queue := os.Getenv("CLOUDTASKS_QUEUE")
	handlerURL := os.Getenv("TASK_HANDLER_URL")

	if project == "" || region == "" || queue == "" || handlerURL == "" {
		return nil, fmt.Errorf("GCP_PROJECT_ID, GCP_REGION, CLOUDTASKS_QUEUE, TASK_HANDLER_URL are required for cloudtasks driver")
	}

	ts, err := google.DefaultTokenSource(ctx, cloudTasksScope)
	if err != nil {
		return nil, fmt.Errorf("default token source: %w", err)
	}

	return &cloudTasksDispatcher{
		httpClient: oauth2.NewClient(ctx, ts),
		queuePath:  fmt.Sprintf("projects/%s/locations/%s/queues/%s", project, region, queue),
		handlerURL: handlerURL,
	}, nil
}

// ctCreateTaskRequest is the JSON body for POST .../tasks.
// https://cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues.tasks/create
type ctCreateTaskRequest struct {
	Task struct {
		HttpRequest struct {
			HttpMethod string            `json:"httpMethod"`
			URL        string            `json:"url"`
			Headers    map[string]string `json:"headers"`
			Body       string            `json:"body"` // base64-encoded
		} `json:"httpRequest"`
	} `json:"task"`
}

func (d *cloudTasksDispatcher) EnqueueEmail(ctx context.Context, payload EmailPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal email payload: %w", err)
	}

	var req ctCreateTaskRequest
	req.Task.HttpRequest.HttpMethod = "POST"
	req.Task.HttpRequest.URL = d.handlerURL + "/internal/tasks/email"
	req.Task.HttpRequest.Headers = map[string]string{"Content-Type": "application/json"}
	req.Task.HttpRequest.Body = base64.StdEncoding.EncodeToString(body)

	reqBody, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("marshal create-task request: %w", err)
	}

	url := fmt.Sprintf("https://cloudtasks.googleapis.com/v2/%s/tasks", d.queuePath)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(reqBody))
	if err != nil {
		return fmt.Errorf("build http request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := d.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("cloud tasks http call: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("cloud tasks API returned status %d", resp.StatusCode)
	}
	return nil
}

func (d *cloudTasksDispatcher) Close() error { return nil }
