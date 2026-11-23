package repository

import (
	"context"
	"github.com/DATA-DOG/go-sqlmock"
	"testing"
)

func TestExplicitClearsAndOmittedFields(t *testing.T) {
	for _, explicit := range []bool{true, false} {
		db, mock, _ := sqlmock.New()
		mock.ExpectQuery("birth_date = CASE WHEN \\$8 THEN EXCLUDED.birth_date ELSE user_profiles.birth_date END").
			WithArgs("user", "Name", nil, nil, nil, "[]", explicit, explicit, explicit).
			WillReturnRows(sqlmock.NewRows([]string{"version"}).AddRow(2))
		version, err := New(db).Upsert(context.Background(), &UserProfile{UserID: "user", Username: "Name", FavoriteSports: "[]",
			SetBirthDate: explicit, SetGender: explicit, SetFavoriteSports: explicit})
		if err != nil || version != 2 {
			t.Fatalf("%d %v", version, err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatal(err)
		}
		db.Close()
	}
}
