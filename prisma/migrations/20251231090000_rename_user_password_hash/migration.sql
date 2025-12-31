-- Rename User password column to passwordHash for NextAuth-compatible naming.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'password'
  ) THEN
    ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";
  END IF;
END $$;
