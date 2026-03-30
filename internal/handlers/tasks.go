package handlers

import (
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gofiber/fiber/v2"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const tasksCollection = "tasks"

// TaskStatus represents the lifecycle of a task.
type TaskStatus string

const (
	TaskStatusTodo       TaskStatus = "todo"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusDone       TaskStatus = "done"
)

// Task is the Firestore document model.
type Task struct {
	ID          string     `firestore:"-"         json:"id"`
	Title       string     `firestore:"title"     json:"title"`
	Description string     `firestore:"description" json:"description"`
	Status      TaskStatus `firestore:"status"    json:"status"`
	AssigneeID  string     `firestore:"assigneeId" json:"assigneeId"`
	DueDate     *time.Time `firestore:"dueDate"   json:"dueDate,omitempty"`
	CreatedAt   time.Time  `firestore:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time  `firestore:"updatedAt" json:"updatedAt"`
}

type createTaskRequest struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	AssigneeID  string     `json:"assigneeId"`
	DueDate     *time.Time `json:"dueDate,omitempty"`
}

type updateTaskRequest struct {
	Title       *string     `json:"title,omitempty"`
	Description *string     `json:"description,omitempty"`
	Status      *TaskStatus `json:"status,omitempty"`
	AssigneeID  *string     `json:"assigneeId,omitempty"`
	DueDate     *time.Time  `json:"dueDate,omitempty"`
}

// RegisterTasks mounts CRUD routes for tasks under the given router.
func RegisterTasks(r fiber.Router, fs *firestore.Client) {
	h := &taskHandler{fs: fs}
	g := r.Group("/tasks")
	g.Get("/", h.list)
	g.Post("/", h.create)
	g.Get("/:id", h.get)
	g.Patch("/:id", h.update)
	g.Delete("/:id", h.delete)
}

type taskHandler struct {
	fs *firestore.Client
}

func (h *taskHandler) list(c *fiber.Ctx) error {
	ctx := c.Context()

	query := h.fs.Collection(tasksCollection).OrderBy("createdAt", firestore.Desc)

	// Optional filter by status
	if s := c.Query("status"); s != "" {
		query = query.Where("status", "==", s)
	}

	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list tasks: "+err.Error())
	}

	result := make([]Task, 0, len(docs))
	for _, doc := range docs {
		var t Task
		if err := doc.DataTo(&t); err != nil {
			continue
		}
		t.ID = doc.Ref.ID
		result = append(result, t)
	}
	return c.JSON(result)
}

func (h *taskHandler) create(c *fiber.Ctx) error {
	ctx := c.Context()

	var req createTaskRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Title == "" {
		return fiber.NewError(fiber.StatusBadRequest, "title is required")
	}

	now := time.Now().UTC()
	t := Task{
		Title:       req.Title,
		Description: req.Description,
		Status:      TaskStatusTodo,
		AssigneeID:  req.AssigneeID,
		DueDate:     req.DueDate,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	ref, _, err := h.fs.Collection(tasksCollection).Add(ctx, t)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create task: "+err.Error())
	}
	t.ID = ref.ID
	return c.Status(fiber.StatusCreated).JSON(t)
}

func (h *taskHandler) get(c *fiber.Ctx) error {
	ctx := c.Context()
	id := c.Params("id")

	doc, err := h.fs.Collection(tasksCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return fiber.NewError(fiber.StatusNotFound, "task not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to get task: "+err.Error())
	}

	var t Task
	if err := doc.DataTo(&t); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to decode task")
	}
	t.ID = doc.Ref.ID
	return c.JSON(t)
}

func (h *taskHandler) update(c *fiber.Ctx) error {
	ctx := c.Context()
	id := c.Params("id")

	var req updateTaskRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	updates := []firestore.Update{
		{Path: "updatedAt", Value: time.Now().UTC()},
	}
	if req.Title != nil {
		updates = append(updates, firestore.Update{Path: "title", Value: *req.Title})
	}
	if req.Description != nil {
		updates = append(updates, firestore.Update{Path: "description", Value: *req.Description})
	}
	if req.Status != nil {
		updates = append(updates, firestore.Update{Path: "status", Value: *req.Status})
	}
	if req.AssigneeID != nil {
		updates = append(updates, firestore.Update{Path: "assigneeId", Value: *req.AssigneeID})
	}
	if req.DueDate != nil {
		updates = append(updates, firestore.Update{Path: "dueDate", Value: *req.DueDate})
	}

	_, err := h.fs.Collection(tasksCollection).Doc(id).Update(ctx, updates)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return fiber.NewError(fiber.StatusNotFound, "task not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update task: "+err.Error())
	}

	// Return the updated document
	return h.get(c)
}

func (h *taskHandler) delete(c *fiber.Ctx) error {
	ctx := c.Context()
	id := c.Params("id")

	_, err := h.fs.Collection(tasksCollection).Doc(id).Delete(ctx)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to delete task: "+err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}
