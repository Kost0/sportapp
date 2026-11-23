
-- Zero means unlimited; it is not an artificial large capacity.
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_max_participants_check;
ALTER TABLE activities ADD CONSTRAINT activities_max_participants_check
  CHECK (max_participants = 0 OR max_participants BETWEEN 2 AND 1000);
ALTER TABLE activity_reports DROP CONSTRAINT IF EXISTS activity_reports_reason_check;
ALTER TABLE activity_reports ALTER COLUMN reason TYPE TEXT;
ALTER TABLE activity_reports ADD CONSTRAINT activity_reports_reason_check
  CHECK (char_length(trim(reason)) BETWEEN 1 AND 2000);
-- Repair old free-place counts from actual memberships without deleting data.
UPDATE activities a SET
  spots_left = CASE WHEN max_participants=0 THEN 0 ELSE GREATEST(max_participants-p.total,0) END,
  status = CASE WHEN status IN ('COMPLETED','CANCELLED') THEN status
    WHEN max_participants>0 AND p.total>=max_participants THEN 'FULL' ELSE 'OPEN' END
FROM (SELECT activity_id,count(*)::int AS total FROM participants GROUP BY activity_id) p
WHERE a.activity_id=p.activity_id AND (
  a.spots_left <> CASE WHEN max_participants=0 THEN 0 ELSE GREATEST(max_participants-p.total,0) END
  OR (a.status IN ('OPEN','FULL') AND a.status <> CASE WHEN max_participants>0 AND p.total>=max_participants THEN 'FULL' ELSE 'OPEN' END));
