package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/fatihatagunn/teamsens/internal/firebase"
)

// FirebaseAuth verifies the Firebase ID token in the Authorization header.
// Returns 401 if the token is missing or invalid.
func FirebaseAuth(fb *firebase.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			return fiber.NewError(fiber.StatusUnauthorized, "missing authorization token")
		}

		token := strings.TrimPrefix(header, "Bearer ")
		if _, err := fb.Auth.VerifyIDToken(c.Context(), token); err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		}

		return c.Next()
	}
}
