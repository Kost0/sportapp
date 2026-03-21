package response

import (
	"encoding/json"
	"net/http"
)

type Envelope struct {
	OK    bool        `json:"ok"`
	Data  interface{} `json:"data,omitempty"`
	Error *ErrorBody  `json:"error,omitempty"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func OK(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Envelope{OK: true, Data: data})
}

func Err(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(Envelope{
		OK:    false,
		Error: &ErrorBody{Code: code, Message: message},
	})
}

func BadRequest(w http.ResponseWriter, code, message string) {
	Err(w, http.StatusBadRequest, code, message)
}

func Internal(w http.ResponseWriter) {
	Err(w, http.StatusInternalServerError, "INTERNAL_ERROR", "unexpected server error")
}

func Unauthorized(w http.ResponseWriter) {
	Err(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid or missing JWT")
}

func Forbidden(w http.ResponseWriter) {
	Err(w, http.StatusForbidden, "FORBIDDEN", "insufficient permissions")
}
