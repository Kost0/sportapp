-- Also applied by the activities service's idempotent startup migration.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS image_url VARCHAR(2048);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS request_id VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_request ON activities(organizer_id, request_id);
CREATE TABLE IF NOT EXISTS user_activity_versions (
  user_id UUID PRIMARY KEY,
  version BIGINT NOT NULL
);
