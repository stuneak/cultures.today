-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "NationState" AS ENUM ('approved', 'pending');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('IMAGE_UPLOAD', 'VIDEO_UPLOAD', 'VIDEO_YOUTUBE');

-- CreateEnum
CREATE TYPE "ContentCategory" AS ENUM ('FOOD', 'MUSIC', 'OTHER');

-- CreateTable
CREATE TABLE users (
    id TEXT NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,

    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE nations (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    state "NationState" NOT NULL DEFAULT 'pending',
    description TEXT,
    flag_url TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    submitted_by_id TEXT,
    boundary geometry(MultiPolygon, 4326),

    CONSTRAINT nations_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE languages (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    nation_id TEXT NOT NULL,

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
    category "ContentCategory" NOT NULL DEFAULT 'OTHER',
    nation_id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT contents_pkey PRIMARY KEY (id)
);

-- CreateIndex
CREATE UNIQUE INDEX users_email_key ON users(email);

-- CreateIndex
CREATE INDEX users_email_idx ON users(email);

-- CreateIndex
CREATE UNIQUE INDEX nations_name_key ON nations(name);

-- CreateIndex
CREATE UNIQUE INDEX nations_slug_key ON nations(slug);

-- CreateIndex
CREATE INDEX nations_slug_idx ON nations(slug);

-- CreateIndex
CREATE INDEX nations_state_idx ON nations(state);

-- AddForeignKey
ALTER TABLE nations ADD CONSTRAINT nations_submitted_by_id_fkey FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE languages ADD CONSTRAINT languages_nation_id_fkey FOREIGN KEY (nation_id) REFERENCES nations(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE phrases ADD CONSTRAINT phrases_language_id_fkey FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE contents ADD CONSTRAINT contents_nation_id_fkey FOREIGN KEY (nation_id) REFERENCES nations(id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS nations_boundary_idx ON nations USING GIST (boundary);
