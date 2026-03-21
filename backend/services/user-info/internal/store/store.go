package store

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ProfileDoc struct {
	ID        string    `bson:"_id"`
	UserID    string    `bson:"userId"`
	Type      string    `bson:"type"`
	Username  string    `bson:"username"`
	AvatarURL string    `bson:"avatarUrl"`
	Version   int64     `bson:"version"`
	UpdatedAt time.Time `bson:"updatedAt"`
}

type ActivityItem struct {
	ActivityID string    `bson:"activityId" json:"activityId"`
	Title      string    `bson:"title"      json:"title"`
	Sport      string    `bson:"sport"      json:"sport"`
	Date       time.Time `bson:"date"       json:"date"`
	Status     string    `bson:"status"     json:"status"`
	MyRole     string    `bson:"myRole"     json:"myRole"`
}

type ActivitiesDoc struct {
	ID         string         `bson:"_id"`
	UserID     string         `bson:"userId"`
	Type       string         `bson:"type"`
	Activities []ActivityItem `bson:"activities"`
	Version    int64          `bson:"version"`
	UpdatedAt  time.Time      `bson:"updatedAt"`
}

type Store struct{ col *mongo.Collection }

func New(db *mongo.Database) *Store {
	col := db.Collection("user_data")
	col.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "userId", Value: 1}, {Key: "type", Value: 1}},
	})
	return &Store{col: col}
}

func (s *Store) UpsertProfile(ctx context.Context, userID, username, avatarURL string, version int64) error {
	id := userID + "/profile"

	result, err := s.col.UpdateOne(ctx,
		bson.M{"_id": id, "version": bson.M{"$lt": version}},
		bson.M{"$set": bson.M{
			"userId":    userID,
			"type":      "profile",
			"username":  username,
			"avatarUrl": avatarURL,
			"version":   version,
			"updatedAt": time.Now(),
		}},
		options.Update().SetUpsert(false),
	)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		_, err = s.col.UpdateOne(ctx,
			bson.M{"_id": id, "version": bson.M{"$exists": false}},
			bson.M{"$setOnInsert": bson.M{
				"_id":       id,
				"userId":    userID,
				"type":      "profile",
				"username":  username,
				"avatarUrl": avatarURL,
				"version":   version,
				"updatedAt": time.Now(),
			}},
			options.Update().SetUpsert(true),
		)
	}

	return err
}

func (s *Store) UpsertActivities(ctx context.Context, userID string, items []ActivityItem, version int64) error {
	id := userID + "/activities"

	result, err := s.col.UpdateOne(ctx,
		bson.M{"_id": id, "version": bson.M{"$lt": version}},
		bson.M{"$set": bson.M{
			"userId":     userID,
			"type":       "activities",
			"activities": items,
			"version":    version,
			"updatedAt":  time.Now(),
		}},
		options.Update().SetUpsert(false),
	)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		_, err = s.col.UpdateOne(ctx,
			bson.M{"_id": id, "version": bson.M{"$exists": false}},
			bson.M{"$setOnInsert": bson.M{
				"_id":        id,
				"userId":     userID,
				"type":       "activities",
				"activities": items,
				"version":    version,
				"updatedAt":  time.Now(),
			}},
			options.Update().SetUpsert(true),
		)
	}

	return err
}

func (s *Store) GetByType(ctx context.Context, userID, docType string) (*bson.M, error) {
	id := userID + "/" + docType

	var doc bson.M

	err := s.col.FindOne(ctx, bson.M{"_id": id}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}

	return &doc, err
}

func (s *Store) GetAll(ctx context.Context, userID string) ([]bson.M, error) {
	cursor, err := s.col.Find(ctx, bson.M{"userId": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var docs []bson.M

	return docs, cursor.All(ctx, &docs)
}

func (s *Store) BatchGetProfiles(ctx context.Context, userIDs []string) ([]ProfileDoc, error) {
	ids := make([]string, len(userIDs))

	for i, id := range userIDs {
		ids[i] = id + "/profile"
	}

	cursor, err := s.col.Find(ctx, bson.M{"_id": bson.M{"$in": ids}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var docs []ProfileDoc

	return docs, cursor.All(ctx, &docs)
}

func (s *Store) VersionCheck(ctx context.Context, userID, docType string, expectedVersion int64) (ready bool, currentVersion int64, err error) {
	id := userID + "/" + docType

	var doc struct {
		Version int64 `bson:"version"`
	}
	err = s.col.FindOne(ctx,
		bson.M{"_id": id},
		options.FindOne().SetProjection(bson.M{"version": 1}),
	).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return false, 0, nil
	}
	if err != nil {
		return false, 0, err
	}

	return doc.Version >= expectedVersion, doc.Version, nil
}
