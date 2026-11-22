BEGIN;

CREATE TABLE IF NOT EXISTS categories (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(50) NOT NULL UNIQUE,
  slug varchar(50) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS vehicles (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id integer NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  stock_number varchar(20) NOT NULL UNIQUE,
  year smallint NOT NULL CHECK (year BETWEEN 1886 AND 2100),
  make varchar(60) NOT NULL,
  model varchar(60) NOT NULL,
  mileage integer NOT NULL CHECK (mileage >= 0),
  transmission varchar(30) NOT NULL,
  drivetrain varchar(20) NOT NULL,
  price numeric(10, 2) NOT NULL CHECK (price > 0),
  description varchar(2000) NOT NULL CHECK (length(trim(description)) > 0),
  availability varchar(12) NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available', 'reserved', 'sold')),
  featured boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS vehicles_category_idx ON vehicles(category_id);

CREATE TABLE IF NOT EXISTS vehicle_images (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id integer NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text varchar(160) NOT NULL,
  credit text,
  source_url text,
  sort_order smallint NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  UNIQUE (vehicle_id, sort_order)
);

CREATE TABLE IF NOT EXISTS users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(80) NOT NULL,
  email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  role varchar(12) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('owner', 'employee', 'customer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  sid varchar PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS user_sessions_expire_idx ON user_sessions(expire);

CREATE TABLE IF NOT EXISTS seed_history (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind varchar(12) NOT NULL CHECK (kind IN ('contact', 'service')),
  name varchar(80) NOT NULL,
  email varchar(254) NOT NULL,
  phone varchar(30),
  vehicle varchar(120),
  message varchar(2000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
