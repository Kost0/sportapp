package store

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type NewsItem struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"`
	NewsID      string             `bson:"newsId"`
	Title       string             `bson:"title"`
	Summary     string             `bson:"summary"`
	ImageURL    string             `bson:"imageUrl"`
	SourceURL   string             `bson:"sourceUrl"`
	Sport       string             `bson:"sport"`
	PublishedAt time.Time          `bson:"publishedAt"`
	CreatedAt   time.Time          `bson:"createdAt"`
}

type Store struct{ col *mongo.Collection }

func New(db *mongo.Database) *Store {
	col := db.Collection("news_items")
	col.Indexes().CreateMany(context.Background(), []mongo.IndexModel{
		{Keys: bson.D{{Key: "publishedAt", Value: -1}}},
		{Keys: bson.D{{Key: "sport", Value: 1}, {Key: "publishedAt", Value: -1}}},
		{
			Keys:    bson.D{{Key: "sourceUrl", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "createdAt", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(2592000),
		},
	})

	return &Store{col: col}
}

func (s *Store) Insert(ctx context.Context, item NewsItem) error {
	item.CreatedAt = time.Now()
	_, err := s.col.InsertOne(ctx, item)
	if mongo.IsDuplicateKeyError(err) {
		return nil
	}

	return err
}

type ListFilter struct {
	Sport  string
	Limit  int
	Offset int
}

func (s *Store) List(ctx context.Context, f ListFilter) ([]NewsItem, int64, error) {
	filter := bson.M{}
	if f.Sport != "" {
		filter["sport"] = f.Sport
	}

	total, err := s.col.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "publishedAt", Value: -1}}).
		SetLimit(int64(f.Limit)).
		SetSkip(int64(f.Offset))

	cursor, err := s.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var items []NewsItem

	return items, total, cursor.All(ctx, &items)
}
