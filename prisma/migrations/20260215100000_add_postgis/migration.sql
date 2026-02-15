CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "NowPlaying" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "spotifyTrackId" TEXT NOT NULL,
  "trackName" TEXT NOT NULL,
  "artistName" TEXT NOT NULL,
  "albumImageUrl" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NowPlaying_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "NowPlaying_expiresAt_idx" ON "NowPlaying" ("expiresAt");
CREATE INDEX IF NOT EXISTS "NowPlaying_spotifyTrackId_idx" ON "NowPlaying" ("spotifyTrackId");

CREATE INDEX IF NOT EXISTS "NowPlaying_geog_gist_idx"
ON "NowPlaying"
USING GIST ((ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography))
WHERE "longitude" IS NOT NULL AND "latitude" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "User_geog_gist_idx"
ON "User"
USING GIST ((ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography))
WHERE "longitude" IS NOT NULL AND "latitude" IS NOT NULL;
