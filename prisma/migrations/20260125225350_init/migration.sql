-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "CultureState" AS ENUM ('approved', 'pending');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('UPLOAD', 'VIDEO_YOUTUBE');

-- CreateTable
CREATE TABLE users (
    id TEXT NOT NULL,
    google_id TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,

    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE sessions (
    id TEXT NOT NULL,
    session_token TEXT NOT NULL,
    user_id TEXT NOT NULL,
    expires TIMESTAMP(3) NOT NULL,

    CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE cultures (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    state "CultureState" NOT NULL DEFAULT 'pending',
    description TEXT,
    flag_url TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    submitted_by_id TEXT,
    boundary geometry(MultiPolygon, 4326),


    CONSTRAINT cultures_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE languages (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    culture_id TEXT NOT NULL,

    CONSTRAINT languages_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE phrases (
    id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    text TEXT NOT NULL,
    translation TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT phrases_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE contents (
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    content_type "ContentType" NOT NULL,
    content_url TEXT,
    culture_id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT contents_pkey PRIMARY KEY (id)
);

-- CreateIndex
CREATE UNIQUE INDEX users_google_id_key ON users(google_id);

-- CreateIndex
CREATE UNIQUE INDEX users_email_key ON users(email);

-- CreateIndex
CREATE INDEX users_email_idx ON users(email);

-- CreateIndex
CREATE UNIQUE INDEX sessions_session_token_key ON sessions(session_token);

-- CreateIndex
CREATE UNIQUE INDEX cultures_name_key ON cultures(name);

-- CreateIndex
CREATE UNIQUE INDEX cultures_slug_key ON cultures(slug);

-- CreateIndex
CREATE INDEX cultures_slug_idx ON cultures(slug);

-- CreateIndex
CREATE INDEX cultures_state_idx ON cultures(state);

-- AddForeignKey
ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE cultures ADD CONSTRAINT cultures_submitted_by_id_fkey FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE languages ADD CONSTRAINT languages_culture_id_fkey FOREIGN KEY (culture_id) REFERENCES cultures(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE phrases ADD CONSTRAINT phrases_language_id_fkey FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE contents ADD CONSTRAINT contents_culture_id_fkey FOREIGN KEY (culture_id) REFERENCES cultures(id) ON DELETE CASCADE ON UPDATE CASCADE;
