CREATE TABLE IF NOT EXISTS user_profiles (
    user_id         UUID          PRIMARY KEY,
    username        VARCHAR(100)  NOT NULL,
    avatar_url      VARCHAR(2048),
    gender          VARCHAR(10)
                        CHECK (gender IN ('MALE','FEMALE','OTHER')),
    birth_date      DATE,
    favorite_sports TEXT          NOT NULL DEFAULT '[]',
    version         BIGINT        NOT NULL DEFAULT 1,
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_username UNIQUE (username)
);
