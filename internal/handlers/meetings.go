package handlers

import (
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/fatihatagunn/teamsens/internal/google"
)

const meetingsCollection = "meetings"

// Meeting is the Firestore document model for a team meeting.
type Meeting struct {
	ID          string    `firestore:"-"           json:"id"`
	Title       string    `firestore:"title"       json:"title"`
	Description string    `firestore:"description" json:"description"`
	StartTime   time.Time `firestore:"startTime"   json:"startTime"`
	EndTime     time.Time `firestore:"endTime"     json:"endTime"`
	Attendees   []string  `firestore:"attendees"   json:"attendees"`
	CalendarID  string    `firestore:"calendarId"  json:"calendarId"`
	EventID     string    `firestore:"eventId"     json:"eventId"`
	MeetLink    string    `firestore:"meetLink"    json:"meetLink"`
	HangoutLink string    `firestore:"hangoutLink" json:"hangoutLink"`
	HTMLLink    string    `firestore:"htmlLink"    json:"htmlLink"`
	CreatedAt   time.Time `firestore:"createdAt"   json:"createdAt"`
}

type createMeetingRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	StartTime   string   `json:"startTime"` // RFC3339
	EndTime     string   `json:"endTime"`   // RFC3339
	Attendees   []string `json:"attendees"`
	CalendarID  string   `json:"calendarId"` // optional, defaults to "primary"
}

// RegisterMeetings mounts meeting routes.
func RegisterMeetings(r fiber.Router, fs *firestore.Client, cal *google.CalendarService) {
	h := &meetingHandler{fs: fs, cal: cal}
	g := r.Group("/meetings")
	g.Get("/", h.list)
	g.Post("/", h.create)
	g.Get("/:id", h.get)
	g.Delete("/:id", h.deleteM)
}

type meetingHandler struct {
	fs  *firestore.Client
	cal *google.CalendarService
}

func (h *meetingHandler) list(c *fiber.Ctx) error {
	ctx := c.Context()

	docs, err := h.fs.Collection(meetingsCollection).
		OrderBy("startTime", firestore.Asc).
		Documents(ctx).GetAll()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list meetings: "+err.Error())
	}

	result := make([]Meeting, 0, len(docs))
	for _, doc := range docs {
		var m Meeting
		if err := doc.DataTo(&m); err != nil {
			continue
		}
		m.ID = doc.Ref.ID
		result = append(result, m)
	}
	return c.JSON(result)
}

func (h *meetingHandler) create(c *fiber.Ctx) error {
	ctx := c.Context()

	var req createMeetingRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Title == "" {
		return fiber.NewError(fiber.StatusBadRequest, "title is required")
	}

	start, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid startTime (RFC3339 expected)")
	}
	end, err := time.Parse(time.RFC3339, req.EndTime)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid endTime (RFC3339 expected)")
	}
	if !end.After(start) {
		return fiber.NewError(fiber.StatusBadRequest, "endTime must be after startTime")
	}

	// Create the Calendar event with a Meet link
	calResult, err := h.cal.CreateMeetingWithConference(ctx, google.CreateMeetingParams{
		Title:           req.Title,
		Description:     req.Description,
		CalendarID:      req.CalendarID,
		StartTime:       start,
		EndTime:         end,
		AttendeesEmails: req.Attendees,
		RequestID:       uuid.New().String(),
	})
	if err != nil {
		return fiber.NewError(fiber.StatusBadGateway, "calendar error: "+err.Error())
	}

	now := time.Now().UTC()
	m := Meeting{
		Title:       req.Title,
		Description: req.Description,
		StartTime:   start,
		EndTime:     end,
		Attendees:   req.Attendees,
		CalendarID:  req.CalendarID,
		EventID:     calResult.EventID,
		MeetLink:    calResult.MeetLink,
		HangoutLink: calResult.HangoutLink,
		HTMLLink:    calResult.HTMLLink,
		CreatedAt:   now,
	}

	ref, _, err := h.fs.Collection(meetingsCollection).Add(ctx, m)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to save meeting: "+err.Error())
	}
	m.ID = ref.ID
	return c.Status(fiber.StatusCreated).JSON(m)
}

func (h *meetingHandler) get(c *fiber.Ctx) error {
	ctx := c.Context()
	id := c.Params("id")

	doc, err := h.fs.Collection(meetingsCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return fiber.NewError(fiber.StatusNotFound, "meeting not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to get meeting: "+err.Error())
	}

	var m Meeting
	if err := doc.DataTo(&m); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to decode meeting")
	}
	m.ID = doc.Ref.ID
	return c.JSON(m)
}

func (h *meetingHandler) deleteM(c *fiber.Ctx) error {
	ctx := c.Context()
	id := c.Params("id")

	// Fetch meeting to get the Calendar event ID
	doc, err := h.fs.Collection(meetingsCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return fiber.NewError(fiber.StatusNotFound, "meeting not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to get meeting: "+err.Error())
	}

	var m Meeting
	if err := doc.DataTo(&m); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to decode meeting")
	}

	// Best-effort: delete the Calendar event (non-fatal if it fails)
	if m.EventID != "" {
		_ = h.cal.DeleteEvent(ctx, m.CalendarID, m.EventID)
	}

	if _, err := h.fs.Collection(meetingsCollection).Doc(id).Delete(ctx); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to delete meeting: "+err.Error())
	}

	return c.SendStatus(fiber.StatusNoContent)
}
