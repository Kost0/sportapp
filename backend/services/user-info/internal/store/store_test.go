package store

import (
	"context"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/integration/mtest"
	"testing"
)

func TestProjectionUsesOneAtomicVersionedUpsert(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))
	for _, kind := range []string{"profile", "activities"} {
		mt.Run(kind, func(mt *mtest.T) {
			mt.AddMockResponses(mtest.CreateSuccessResponse(bson.E{Key: "n", Value: 1}, bson.E{Key: "nModified", Value: 0}))
			store := &Store{col: mt.Coll}
			var err error
			if kind == "profile" {
				err = store.UpsertProfile(context.Background(), "user", "$name", "", 2)
			} else {
				err = store.UpsertActivities(context.Background(), "user", nil, 2)
			}
			if err != nil {
				mt.Fatal(err)
			}
			event := mt.GetStartedEvent()
			if event == nil || event.CommandName != "update" {
				mt.Fatal("missing atomic update")
			}
			updates, _ := event.Command.Lookup("updates").Array().Values()
			update := updates[0].Document()
			filter := update.Lookup("q").Document()
			if filter.Lookup("_id").StringValue() != "user/"+kind {
				mt.Fatal("wrong document")
			}
			if _, err := filter.LookupErr("version"); err == nil {
				mt.Fatal("version must not be part of an upsert filter")
			}
			if !update.Lookup("upsert").Boolean() {
				mt.Fatal("new documents must be inserted")
			}
			pipeline, _ := update.Lookup("u").Array().Values()
			fields := pipeline[0].Document().Lookup("$set").Document()
			cond, _ := fields.Lookup("version").Document().Lookup("$cond").Array().Values()
			if cond[0].Document().Lookup("$lt").Type == 0 {
				mt.Fatal("missing stale-event guard")
			}
			if mt.GetStartedEvent() != nil {
				mt.Fatal("projection must be written once")
			}
		})
	}
}
