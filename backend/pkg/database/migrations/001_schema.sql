CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone         TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movies (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    genre           TEXT[] NOT NULL DEFAULT '{}',
    rating          DOUBLE PRECISION NOT NULL DEFAULT 0,
    duration        INTEGER NOT NULL DEFAULT 0,
    poster_url      TEXT NOT NULL DEFAULT '',
    trailer_url     TEXT NOT NULL DEFAULT '',
    release_date    TEXT NOT NULL DEFAULT '',
    director        TEXT NOT NULL DEFAULT '',
    "cast"          TEXT[] NOT NULL DEFAULT '{}',
    language        TEXT NOT NULL DEFAULT 'English',
    is_now_showing  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS showtimes (
    id          TEXT PRIMARY KEY,
    movie_id    TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    theater     TEXT NOT NULL,
    date_time   TIMESTAMPTZ NOT NULL,
    prices      JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_showtimes_movie_id  ON showtimes(movie_id);
CREATE INDEX IF NOT EXISTS idx_showtimes_date_time ON showtimes(date_time);

CREATE TABLE IF NOT EXISTS seats (
    id          TEXT PRIMARY KEY,
    showtime_id TEXT NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    row         TEXT NOT NULL,
    number      INTEGER NOT NULL,
    type        TEXT NOT NULL,
    is_booked   BOOLEAN NOT NULL DEFAULT false,
    price       DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seats_showtime_id ON seats(showtime_id);

CREATE TABLE IF NOT EXISTS bookings (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    showtime_id  TEXT NOT NULL REFERENCES showtimes(id),
    seat_ids     TEXT[] NOT NULL DEFAULT '{}',
    total_amount DOUBLE PRECISION NOT NULL,
    status       TEXT NOT NULL DEFAULT 'confirmed',
    booked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id, created_at);
