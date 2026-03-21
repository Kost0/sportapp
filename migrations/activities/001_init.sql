CREATE TABLE IF NOT EXISTS activities (
    activity_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id      UUID         NOT NULL,
    title             VARCHAR(200) NOT NULL,
    sport             VARCHAR(30)  NOT NULL
                          CHECK (sport IN ('football','basketball','volleyball','tennis',
                                           'badminton','running','cycling','swimming','parkour','other')),
    lat               DECIMAL(9,6) NOT NULL,
    lon               DECIMAL(9,6) NOT NULL,
    address           VARCHAR(500) NOT NULL,
    date              TIMESTAMPTZ  NOT NULL,
    max_participants  SMALLINT     NOT NULL CHECK (max_participants BETWEEN 2 AND 1000),
    spots_left        SMALLINT     NOT NULL CHECK (spots_left >= 0),
    description       TEXT,
    status            VARCHAR(20)  NOT NULL DEFAULT 'OPEN'
                          CHECK (status IN ('OPEN','FULL','COMPLETED','CANCELLED')),
    version           BIGINT       NOT NULL DEFAULT 1,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_spots_not_exceed CHECK (spots_left <= max_participants)
);

CREATE INDEX IF NOT EXISTS idx_activities_status_date ON activities(status, date);
CREATE INDEX IF NOT EXISTS idx_activities_sport       ON activities(sport);
CREATE INDEX IF NOT EXISTS idx_activities_organizer   ON activities(organizer_id);


CREATE TABLE IF NOT EXISTS participants (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID        NOT NULL REFERENCES activities(activity_id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('ORGANIZER','PARTICIPANT')),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_participant UNIQUE (activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_activity ON participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_participants_user     ON participants(user_id);


CREATE TABLE IF NOT EXISTS participation_history (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID        NOT NULL,
    user_id     UUID        NOT NULL,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('ORGANIZER','PARTICIPANT')),
    outcome     VARCHAR(20) NOT NULL CHECK (outcome IN ('COMPLETED','LEFT','CANCELLED')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_user_id      ON participation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ph_activity_id  ON participation_history(activity_id);
CREATE INDEX IF NOT EXISTS idx_ph_user_created ON participation_history(user_id, created_at DESC);


CREATE TABLE IF NOT EXISTS activity_reports (
    report_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID        NOT NULL REFERENCES activities(activity_id) ON DELETE CASCADE,
    reporter_id UUID        NOT NULL,
    reason      VARCHAR(50) NOT NULL
                    CHECK (reason IN ('spam','inappropriate','fake','dangerous','other')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_report UNIQUE (activity_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_activity ON activity_reports(activity_id);
