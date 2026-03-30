package handlers

import (
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gofiber/fiber/v2"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/fatihatagunn/teamsens/internal/tasks"
)

const partnersCollection = "partners"

// PartnerStatus defines the relationship stage with a partner.
type PartnerStatus string

const (
	PartnerStatusProspect PartnerStatus = "prospect"
	PartnerStatusActive   PartnerStatus = "active"
	PartnerStatusInactive PartnerStatus = "inactive"
)

// Partner is the Firestore document model.
type Partner struct {
	ID          string        `firestore:"-"           json:"id"`
	Name        string        `firestore:"name"        json:"name"`
	Email       string        `firestore:"email"       json:"email"`
	ContactName string        `firestore:"contactName" json:"contactName"`
	Status      PartnerStatus `firestore:"status"      json:"status"`
	Notes       string        `firestore:"notes"       json:"notes"`
	CreatedAt   time.Time     `firestore:"createdAt"   json:"createdAt"`
	UpdatedAt   time.Time     `firestore:"updatedAt"   json:"updatedAt"`
}

type createPartnerRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	ContactName string `json:"contactName"`
	Notes       string `json:"notes"`
}

type sendEmailRequest struct {
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

// RegisterPartners mounts partner CRUD and email-dispatch routes.
func RegisterPartners(r fiber.Router, fs *firestore.Client, d tasks.Dispatcher) {
	h := &partnerHandler{fs: fs, dispatcher: d}
	g := r.Group("/partners")
	g.Get("/", h.list)
	g.Post("/", h.create)
	g.Get("/:id", h.get)
	g.Patch("/:id/status", h.updateStatus)
	g.Post("/:id/email", h.sendEmail)
	g.Delete("/:id", h.deleteP)
}

type partnerHandler struct {
	fs         *firestore.Client
	dispatcher tasks.Dispatcher
}

func (h *partnerHandler) list(c *fiber.Ctx) error {
	ctx := c.Context()

	docs, err := h.fs.Collection(partnersCollection).
		OrderBy("name", firestore.Asc).
		Documents(ctx).GetAll()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list partners: "+err.Error())
	}

	result := make([]Partner, 0, len(docs))
	for _, doc := range docs {
		var p Partner
		if err := doc.DataTo(&p); err != nil {
			continue
		}
		p.ID = doc.Ref.ID
		result = append(result, p)
	}
	return c.JSON(result)
}

func (h *partnerHandler) create(c *fiber.Ctx) error {
	ctx := c.Context()

	var req createPartnerRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Name == "" || req.Email == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name and email are required")
	}

	now := time.Now().UTC()
	p := Partner{
		Name:        req.Name,
		Email:       req.Email,
		ContactName: req.ContactName,
		Notes:       req.Notes,
		Status:      PartnerStatusProspect,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	ref, _, err := h.fs.Collection(partnersCollection).Add(ctx, p)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create partner: "+err.Error())
	}
	p.ID = ref.ID
	return c.Status(fiber.StatusCreated).JSON(p)
}

func (h *partnerHandler) get(c *fiber.Ctx) error {
	ctx := c.Context()
	id := c.Params("id")

	doc, err := h.fs.Collection(partnersCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return fiber.NewError(fiber.StatusNotFound, "partner not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to get partner: "+err.Error())
	}

	var p Partner
	if err := doc.DataTo(&p); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to decode partner")
	}
	p.ID = doc.Ref.ID
	return c.JSON(p)
}

func (h *partnerHandler) updateStatus(c *fiber.Ctx) error {
	ctx := c.Context()
	id := c.Params("id")

	var body struct {
		Status PartnerStatus `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	_, err := h.fs.Collection(partnersCollection).Doc(id).Update(ctx, []firestore.Update{
		{Path: "status", Value: body.Status},
		{Path: "updatedAt", Value: time.Now().UTC()},
	})
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return fiber.NewError(fiber.StatusNotFound, "partner not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update partner: "+err.Error())
	}
	return h.get(c)
}

// sendEmail dispatches an email task to the background job queue.
func (h *partnerHandler) sendEmail(c *fiber.Ctx) error {
	ctx := c.Context()
	id := c.Params("id")

	// Fetch partner to get the email address
	doc, err := h.fs.Collection(partnersCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return fiber.NewError(fiber.StatusNotFound, "partner not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to get partner: "+err.Error())
	}
	var p Partner
	if err := doc.DataTo(&p); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to decode partner")
	}

	var req sendEmailRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Subject == "" || req.Body == "" {
		return fiber.NewError(fiber.StatusBadRequest, "subject and body are required")
	}

	payload := tasks.EmailPayload{
		To:      p.Email,
		Subject: req.Subject,
		Body:    req.Body,
	}
	if err := h.dispatcher.EnqueueEmail(ctx, payload); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to enqueue email: "+err.Error())
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"message": "email queued",
		"to":      p.Email,
	})
}

func (h *partnerHandler) deleteP(c *fiber.Ctx) error {
	ctx := c.Context()
	id := c.Params("id")

	if _, err := h.fs.Collection(partnersCollection).Doc(id).Delete(ctx); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to delete partner: "+err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}
