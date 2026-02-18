-- Query scaling indexes for first 10k users target

-- User listings / admin pages
CREATE INDEX IF NOT EXISTS "User_createdAt_id_idx" ON "User"("createdAt", "id");
CREATE INDEX IF NOT EXISTS "User_role_createdAt_idx" ON "User"("role", "createdAt");

-- Show filtering by upcoming + city
CREATE INDEX IF NOT EXISTS "Show_startsAt_city_idx" ON "Show"("startsAt", "city");

-- Session cleanup and lookup patterns
CREATE INDEX IF NOT EXISTS "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- Password reset lookup/expiry
CREATE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_expiresAt_idx" ON "PasswordResetToken"("tokenHash", "expiresAt");

-- Trendings aggregation windows
CREATE INDEX IF NOT EXISTS "TrendingPlayback_playedAt_artistKey_idx" ON "TrendingPlayback"("playedAt", "artistKey");
CREATE INDEX IF NOT EXISTS "TrendingPlayback_playedAt_trackKey_idx" ON "TrendingPlayback"("playedAt", "trackKey");
CREATE INDEX IF NOT EXISTS "TrendingPlayback_playedAt_userId_idx" ON "TrendingPlayback"("playedAt", "userId");
