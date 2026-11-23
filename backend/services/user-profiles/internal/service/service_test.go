package service

import (
	"context"
	"testing"
)

func TestInvalidBirthDateIsRejectedBeforeWriting(t *testing.T) {
	svc := &Service{}
	for _, date := range []string{"2025-02-29", "2000-13-01", "2999-01-01", "invalid"} {
		_, err := svc.Update(context.Background(), UpdateInput{UserID: "user", Username: "Name", BirthDate: &date})
		if err != ErrInvalidProfile {
			t.Fatalf("%s: %v", date, err)
		}
	}
}
