package google

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// TokenStore defines how OAuth2 tokens are persisted and retrieved.
// Implement this interface to store tokens in Firestore, Redis, etc.
type TokenStore interface {
	GetToken(ctx context.Context, userID string) (*oauth2.Token, error)
	SaveToken(ctx context.Context, userID string, token *oauth2.Token) error
}

// oauthConfig builds the OAuth2 config from environment variables.
// Required env vars:
//
//	GOOGLE_OAUTH_CLIENT_ID
//	GOOGLE_OAUTH_CLIENT_SECRET
//	GOOGLE_OAUTH_REDIRECT_URL
func oauthConfig(scopes []string) (*oauth2.Config, error) {
	clientID := os.Getenv("GOOGLE_OAUTH_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")
	redirectURL := os.Getenv("GOOGLE_OAUTH_REDIRECT_URL")

	if clientID == "" || clientSecret == "" {
		return nil, fmt.Errorf("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are required")
	}

	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       scopes,
		Endpoint:     google.Endpoint,
	}, nil
}

// AuthCodeURL returns the Google consent page URL for the given scopes.
func AuthCodeURL(scopes []string, state string) (string, error) {
	cfg, err := oauthConfig(scopes)
	if err != nil {
		return "", err
	}
	return cfg.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce), nil
}

// ExchangeCode exchanges an authorisation code for tokens.
func ExchangeCode(ctx context.Context, code string, scopes []string) (*oauth2.Token, error) {
	cfg, err := oauthConfig(scopes)
	if err != nil {
		return nil, err
	}
	token, err := cfg.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("oauth2 exchange: %w", err)
	}
	return token, nil
}

// TokenFromJSON deserialises a token stored as JSON bytes.
func TokenFromJSON(data []byte) (*oauth2.Token, error) {
	var t oauth2.Token
	if err := json.Unmarshal(data, &t); err != nil {
		return nil, fmt.Errorf("token unmarshal: %w", err)
	}
	return &t, nil
}

// TokenToJSON serialises a token to JSON bytes for storage.
func TokenToJSON(t *oauth2.Token) ([]byte, error) {
	data, err := json.Marshal(t)
	if err != nil {
		return nil, fmt.Errorf("token marshal: %w", err)
	}
	return data, nil
}

// ServiceAccountTokenSource returns a token source using the service account
// credentials (application default credentials on GCP). Use this for
// server-to-server calls that don't require user consent.
func ServiceAccountTokenSource(ctx context.Context, scopes []string) (oauth2.TokenSource, error) {
	ts, err := google.DefaultTokenSource(ctx, scopes...)
	if err != nil {
		return nil, fmt.Errorf("default token source: %w", err)
	}
	return ts, nil
}

