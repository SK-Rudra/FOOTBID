-- AlterTable
ALTER TABLE "Squad" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SquadPlayer" ADD COLUMN     "isCaptain" BOOLEAN NOT NULL DEFAULT false;

-- Squad revisions must remain monotonic non-negative integers.
ALTER TABLE "Squad"
ADD CONSTRAINT "Squad_version_check"
CHECK ("version" >= 0);

-- A captain must always belong to the starting eleven.
ALTER TABLE "SquadPlayer"
ADD CONSTRAINT "SquadPlayer_captain_role_check"
CHECK ("isCaptain" = FALSE OR "role" = 'STARTER');

-- Each squad may contain at most one captain.
CREATE UNIQUE INDEX "SquadPlayer_one_captain_per_squad_idx"
ON "SquadPlayer" ("squadId")
WHERE "isCaptain" = TRUE;

-- A locked squad requires exactly eleven starters and one starter captain.
CREATE OR REPLACE FUNCTION "validate_locked_squad"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  starter_count INTEGER;
  captain_count INTEGER;
BEGIN
  IF NEW."isLocked" = TRUE THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE "isCaptain" = TRUE)
    INTO
      starter_count,
      captain_count
    FROM "SquadPlayer"
    WHERE "squadId" = NEW."id"
      AND "role" = 'STARTER';

    IF starter_count <> 11 THEN
      RAISE EXCEPTION
        'A locked squad must contain exactly 11 starters; found %.',
        starter_count;
    END IF;

    IF captain_count <> 1 THEN
      RAISE EXCEPTION
        'A locked squad must contain exactly one starter captain; found %.',
        captain_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;