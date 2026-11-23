package store

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type GeoPoint struct {
	Type        string    `bson:"type"`
	Coordinates []float64 `bson:"coordinates"`
}

type MapActivity struct {
	ID              string    `bson:"_id"`
	ActivityID      string    `bson:"activityId"`
	OrganizerID     string    `bson:"organizerId"`
	Title           string    `bson:"title"`
	Sport           string    `bson:"sport"`
	Location        GeoPoint  `bson:"location"`
	Address         string    `bson:"address"`
	Date            time.Time `bson:"date"`
	SpotsLeft       int       `bson:"spotsLeft"`
	MaxParticipants int       `bson:"maxParticipants"`
	Status          string    `bson:"status"`
	Version         int64     `bson:"version"`
	UpdatedAt       time.Time `bson:"updatedAt"`
}

type Store struct{ col *mongo.Collection }

func New(db *mongo.Database) *Store {
	col := db.Collection("map_activities")
	col.Indexes().CreateMany(context.Background(), []mongo.IndexModel{
		{Keys: bson.D{{Key: "location", Value: "2dsphere"}}},
		{Keys: bson.D{{Key: "sport", Value: 1}, {Key: "date", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
	})

	return &Store{col: col}
}

type SearchFilter struct {
	Lat      float64
	Lon      float64
	Radius   int
	Sport    string
	DateFrom time.Time
}

func (s *Store) Search(ctx context.Context, f SearchFilter) ([]MapActivity, error) {
	filter := bson.M{
		"deleted": bson.M{"$ne": true},
		"location": bson.M{
			"$near": bson.M{
				"$geometry":    bson.M{"type": "Point", "coordinates": []float64{f.Lon, f.Lat}},
				"$maxDistance": f.Radius,
			},
		},
		"status": bson.M{"$in": []string{"OPEN", "FULL"}},
	}
	if !f.DateFrom.IsZero() {
		filter["date"] = bson.M{"$gte": f.DateFrom}
	} else {
		filter["date"] = bson.M{"$gte": time.Now()}
	}
	if f.Sport != "" {
		filter["sport"] = f.Sport
	}

	cursor, err := s.col.Find(ctx, filter, options.Find().SetLimit(200))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var docs []MapActivity

	return docs, cursor.All(ctx, &docs)
}

func (s *Store) Insert(ctx context.Context, a MapActivity) error {
	fields := bson.M{"activityId": a.ActivityID, "organizerId": a.OrganizerID,
		"title": a.Title, "sport": a.Sport, "location": a.Location, "address": a.Address, "date": a.Date,
		"maxParticipants": a.MaxParticipants, "spotsLeft": a.SpotsLeft, "status": a.Status, "deleted": false}
	return s.upsertVersioned(ctx, a.ActivityID, a.Version, fields, false)
}

func (s *Store) upsertVersioned(ctx context.Context, id string, version int64, fields bson.M, allowEqual bool) error {
	op := "$lt"
	if allowEqual {
		op = "$lte"
	}
	newer := bson.M{op: bson.A{bson.M{"$ifNull": bson.A{"$version", int64(-1)}}, version}}
	fields["version"] = version
	fields["updatedAt"] = time.Now()
	updates := bson.M{}
	for key, value := range fields {
		updates[key] = bson.M{"$cond": bson.A{newer, bson.M{"$literal": value}, "$" + key}}
	}
	_, err := s.col.UpdateOne(ctx, bson.M{"_id": id}, mongo.Pipeline{bson.D{{Key: "$set", Value: updates}}}, options.Update().SetUpsert(true))
	return err
}

func (s *Store) UpdateFields(ctx context.Context, activityID string, fields bson.M, eventVersion int64) error {
	fields["version"] = eventVersion
	fields["updatedAt"] = time.Now()
	_, err := s.col.UpdateOne(ctx,
		bson.M{"_id": activityID, "version": bson.M{"$lt": eventVersion}},
		bson.M{"$set": fields},
	)

	return err
}

func (s *Store) SetMembershipState(ctx context.Context, activityID string, spots int, eventVersion int64) error {
	status := bson.M{"$cond": bson.A{bson.M{"$and": bson.A{bson.M{"$ne": bson.A{"$maxParticipants", 0}}, spots == 0}}, "FULL", "OPEN"}}
	_, err := s.col.UpdateOne(ctx, bson.M{"_id": activityID, "version": bson.M{"$lt": eventVersion}},
		mongo.Pipeline{bson.D{{Key: "$set", Value: bson.M{"spotsLeft": spots, "status": status, "version": eventVersion, "updatedAt": time.Now()}}}})
	return err
}

// Legacy paired status events can share a version with a membership event.
func (s *Store) SetStatus(ctx context.Context, activityID, status string, eventVersion int64) error {
	_, err := s.col.UpdateOne(ctx,
		bson.M{"_id": activityID, "version": bson.M{"$lte": eventVersion}},
		bson.M{"$set": bson.M{
			"status":    status,
			"version":   eventVersion,
			"updatedAt": time.Now(),
		}},
	)

	return err
}

func (s *Store) Delete(ctx context.Context, activityID string, version int64) error {
	// Keep a tombstone so a delayed snapshot cannot resurrect a deleted activity.
	return s.upsertVersioned(ctx, activityID, version, bson.M{"deleted": true}, true)
}
