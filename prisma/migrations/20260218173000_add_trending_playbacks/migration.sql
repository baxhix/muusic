CREATE TABLE IF NOT EXISTS "TrendingPlayback" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "artistId" TEXT,
  "artistName" TEXT NOT NULL,
  "artistKey" TEXT NOT NULL,
  "trackId" TEXT,
  "trackName" TEXT NOT NULL,
  "trackKey" TEXT NOT NULL,
  "trackFingerprint" TEXT NOT NULL,
  "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrendingPlayback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrendingPlayback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TrendingPlayback_playedAt_idx" ON "TrendingPlayback"("playedAt");
CREATE INDEX IF NOT EXISTS "TrendingPlayback_userId_trackFingerprint_playedAt_idx" ON "TrendingPlayback"("userId", "trackFingerprint", "playedAt");
CREATE INDEX IF NOT EXISTS "TrendingPlayback_artistKey_playedAt_idx" ON "TrendingPlayback"("artistKey", "playedAt");
CREATE INDEX IF NOT EXISTS "TrendingPlayback_trackKey_playedAt_idx" ON "TrendingPlayback"("trackKey", "playedAt");
