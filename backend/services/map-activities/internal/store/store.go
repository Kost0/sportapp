package store

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type GeoPoint struct {
	Type        string    `bson:"type`
	Coordinates []float64 `bson:"coordinates"`
}

type MapActivity struct {
	ID          string    `bson:"_id"`
	ActivityID  string    `bson:"activityId"`
	OrganizerID string    `bson:"organizerId"`
	Title       string    `bson:"title"`
	Sport       string    `bson:"sport"`
	Location    GeoPoint  `bson:"location"`
	Address     string    `bson:"address"`
	Date        time.Time `bson:"date"`
	SpotsLeft   int       `bson:"spotsLeft"`
	Status      string    `bson:"status"`
	Version     int64     `bson:"version"`
	UpdatedAt   time.Time `bson:"updatedAt"`
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
	a.UpdatedAt = time.Now()
	_, err := s.col.InsertOne(ctx, a)

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

func (s *Store) IncrSpotsLeft(ctx context.Context, activityID string, delta int, eventVersion int64) error {
	_, err := s.col.UpdateOne(ctx,
		bson.M{"_id": activityID, "version": bson.M{"$lt": eventVersion}},
		bson.M{
			"$inc": bson.M{"spotsLeft": delta},
			"$set": bson.M{"version": eventVersion, "updatedAt": time.Now()},
		},
	)

	return err
}

// SetStatus updates status only if stored version < eventVersion.
func (s *Store) SetStatus(ctx context.Context, activityID, status string, eventVersion int64) error {
	_, err := s.col.UpdateOne(ctx,
		bson.M{"_id": activityID, "version": bson.M{"$lt": eventVersion}},
		bson.M{"$set": bson.M{
			"status":    status,
			"version":   eventVersion,
			"updatedAt": time.Now(),
		}},
	)

	return err
}

func (s *Store) Delete(ctx context.Context, activityID string) error {
	_, err := s.col.DeleteOne(ctx, bson.M{"_id": activityID})

	return err
}
