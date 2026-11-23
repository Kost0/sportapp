package repository

import (
	"context"
	"github.com/lib/pq"
)

type Place struct {
	PlaceID string   `json:"placeId"`
	Address string   `json:"address"`
	Lat     float64  `json:"lat"`
	Lon     float64  `json:"lon"`
	Sports  []string `json:"sports"`
}

// Reuse locations from existing activities, including past ones. Group identical
// addresses/coordinates so repeated activities don't create duplicate places.
func (r *Repository) ListPlaces(ctx context.Context, search, placeID string) ([]Place, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT
      md5(lower(trim(address)) || '|' || lat::text || '|' || lon::text),
      min(trim(address)),lat,lon,array_agg(DISTINCT sport ORDER BY sport)
      FROM activities WHERE (NULLIF($1,'') IS NULL OR address ILIKE '%' || $1 || '%')
      AND (NULLIF($2,'') IS NULL OR md5(lower(trim(address)) || '|' || lat::text || '|' || lon::text)=$2)
      GROUP BY lower(trim(address)),lat,lon
      ORDER BY max(updated_at) DESC,lower(trim(address)),lat,lon LIMIT 200`, search, placeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	places := make([]Place, 0)
	for rows.Next() {
		var place Place
		if err = rows.Scan(&place.PlaceID, &place.Address, &place.Lat, &place.Lon, pq.Array(&place.Sports)); err != nil {
			return nil, err
		}
		places = append(places, place)
	}
	return places, rows.Err()
}
