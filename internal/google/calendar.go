package google

import (
	"context"
	"fmt"
	"os"
	"time"

	"golang.org/x/oauth2"
	googleoauth2 "golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

// CalendarService wraps the Google Calendar API client.
type CalendarService struct {
	svc *calendar.Service
}

// NewCalendarService creates a CalendarService using application-default
// credentials (service account on Cloud Run, or GOOGLE_APPLICATION_CREDENTIALS
// locally). The service account must have domain-wide delegation if creating
// events on behalf of users.
func NewCalendarService(ctx context.Context) (*CalendarService, error) {
	var opts []option.ClientOption

	if keyPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"); keyPath != "" {
		opts = append(opts, option.WithCredentialsFile(keyPath))
	} else {
		ts, err := googleoauth2.DefaultTokenSource(ctx, calendar.CalendarScope)
		if err != nil {
			return nil, fmt.Errorf("calendar default token source: %w", err)
		}
		opts = append(opts, option.WithTokenSource(ts))
	}

	svc, err := calendar.NewService(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("calendar.NewService: %w", err)
	}
	return &CalendarService{svc: svc}, nil
}

// NewCalendarServiceWithToken creates a CalendarService using an end-user
// OAuth2 token (user-delegated access).
func NewCalendarServiceWithToken(ctx context.Context, token *oauth2.Token, cfg *oauth2.Config) (*CalendarService, error) {
	ts := cfg.TokenSource(ctx, token)
	svc, err := calendar.NewService(ctx, option.WithTokenSource(ts))
	if err != nil {
		return nil, fmt.Errorf("calendar.NewService (user token): %w", err)
	}
	return &CalendarService{svc: svc}, nil
}

// CreateMeetingParams holds all parameters needed to create a Calendar event
// with an embedded Google Meet link.
type CreateMeetingParams struct {
	Title       string
	Description string
	CalendarID  string // "primary" or a specific calendar ID
	StartTime   time.Time
	EndTime     time.Time
	AttendeesEmails []string
	RequestID   string // idempotency key – use a stable UUID per meeting
}

// MeetingResult contains the created event details.
type MeetingResult struct {
	EventID  string
	HangoutLink string    // legacy Meet URL
	MeetLink string       // conference entry point URL
	HTMLLink string       // Google Calendar web link
	StartTime time.Time
	EndTime  time.Time
}

// CreateMeetingWithConference creates a Calendar event that automatically
// provisions a Google Meet conference link via the Conference Data API.
//
// The service account must have "Create new conferences" enabled, or the
// calendar must allow conference creation.
func (s *CalendarService) CreateMeetingWithConference(ctx context.Context, p CreateMeetingParams) (*MeetingResult, error) {
	if p.CalendarID == "" {
		p.CalendarID = "primary"
	}

	attendees := make([]*calendar.EventAttendee, 0, len(p.AttendeesEmails))
	for _, email := range p.AttendeesEmails {
		attendees = append(attendees, &calendar.EventAttendee{Email: email})
	}

	event := &calendar.Event{
		Summary:     p.Title,
		Description: p.Description,
		Start: &calendar.EventDateTime{
			DateTime: p.StartTime.Format(time.RFC3339),
			TimeZone: "Europe/Istanbul",
		},
		End: &calendar.EventDateTime{
			DateTime: p.EndTime.Format(time.RFC3339),
			TimeZone: "Europe/Istanbul",
		},
		Attendees: attendees,
		ConferenceData: &calendar.ConferenceData{
			CreateRequest: &calendar.CreateConferenceRequest{
				RequestId: p.RequestID,
				ConferenceSolutionKey: &calendar.ConferenceSolutionKey{
					Type: "hangoutsMeet",
				},
			},
		},
	}

	created, err := s.svc.Events.Insert(p.CalendarID, event).
		ConferenceDataVersion(1).
		Context(ctx).
		Do()
	if err != nil {
		return nil, fmt.Errorf("events.Insert: %w", err)
	}

	result := &MeetingResult{
		EventID:     created.Id,
		HangoutLink: created.HangoutLink,
		HTMLLink:    created.HtmlLink,
	}

	// Extract the Meet URL from ConferenceData entry points.
	if created.ConferenceData != nil {
		for _, ep := range created.ConferenceData.EntryPoints {
			if ep.EntryPointType == "video" {
				result.MeetLink = ep.Uri
				break
			}
		}
	}

	if t, err := time.Parse(time.RFC3339, created.Start.DateTime); err == nil {
		result.StartTime = t
	}
	if t, err := time.Parse(time.RFC3339, created.End.DateTime); err == nil {
		result.EndTime = t
	}

	return result, nil
}

// DeleteEvent removes a Calendar event by ID.
func (s *CalendarService) DeleteEvent(ctx context.Context, calendarID, eventID string) error {
	if calendarID == "" {
		calendarID = "primary"
	}
	if err := s.svc.Events.Delete(calendarID, eventID).Context(ctx).Do(); err != nil {
		return fmt.Errorf("events.Delete: %w", err)
	}
	return nil
}

// GetEvent retrieves a Calendar event by ID.
func (s *CalendarService) GetEvent(ctx context.Context, calendarID, eventID string) (*calendar.Event, error) {
	if calendarID == "" {
		calendarID = "primary"
	}
	event, err := s.svc.Events.Get(calendarID, eventID).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("events.Get: %w", err)
	}
	return event, nil
}
