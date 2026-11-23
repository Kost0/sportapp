package service

import (
	"testing"
	"time"
)

func TestUpdateValidation(t *testing.T) {
	for _, value := range []interface{}{-1.0, 1.0, 2.5, 1001.0, "10", nil} {
		if err := validateUpdates(map[string]interface{}{"maxParticipants": value}); err != ErrInvalidActivity {
			t.Fatalf("accepted invalid limit %v", value)
		}
	}
	for _, value := range []float64{0, 2, 1000} {
		input := map[string]interface{}{"maxParticipants": value}
		if err := validateUpdates(input); err != nil {
			t.Fatal(err)
		}
		if input["maxParticipants"] != int(value) {
			t.Fatal("limit not normalized")
		}
	}
	for _, input := range []map[string]interface{}{
		{"title": " "}, {"sport": "invalid"}, {"address": ""}, {"date": "not a date"},
		{"date": time.Now().Add(-time.Hour).Format(time.RFC3339)}, {"lat": 91.0}, {"lon": -181.0},
		{"status": "OPEN"},
	} {
		if err := validateUpdates(input); err != ErrInvalidActivity {
			t.Fatalf("accepted invalid update %v", input)
		}
	}
	if err := validateUpdates(map[string]interface{}{"title": " Valid title ", "sport": "badminton", "date": time.Now().Add(time.Hour).Format(time.RFC3339)}); err != nil {
		t.Fatal(err)
	}
}
