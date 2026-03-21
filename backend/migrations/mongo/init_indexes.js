db = db.getSiblingDB("map_activities_db");

db.map_activities.createIndex({ location: "2dsphere" });
db.map_activities.createIndex({ sport: 1, date: 1 });
db.map_activities.createIndex({ status: 1 });

print("map_activities_db indexes OK");

db = db.getSiblingDB("user_info_db");

db.user_data.createIndex({ userId: 1, type: 1 });

print("user_info_db indexes OK");

db = db.getSiblingDB("news_feed_db");

db.news_items.createIndex({ publishedAt: -1 });
db.news_items.createIndex({ sport: 1, publishedAt: -1 });
db.news_items.createIndex({ sourceUrl: 1 }, { unique: true });

db.news_items.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

print("news_feed_db indexes OK");
