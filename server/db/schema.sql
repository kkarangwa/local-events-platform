-- Gada Events database schema.
-- Safe to run more than once: it only creates what is missing.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'participant'
    CHECK (role IN ('participant', 'organizer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_website TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_description TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_range TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_level TEXT;

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  organizer_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  venue VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS price_type TEXT NOT NULL DEFAULT 'free';
ALTER TABLE events ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'RWF';
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS target_audience TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS target_age_ranges TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS target_experience TEXT NOT NULL DEFAULT 'All levels';

CREATE INDEX IF NOT EXISTS events_organizer_idx ON events (organizer_id);
CREATE INDEX IF NOT EXISTS events_status_date_idx ON events (status, event_date);

-- Registrations are kept when an event is removed: deleting an event that
-- has registrations is refused by the API (foreign key, error 23503).
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  participant_id INTEGER REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, participant_id)
);

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS attended BOOLEAN;

CREATE INDEX IF NOT EXISTS registrations_event_idx ON registrations (event_id);
