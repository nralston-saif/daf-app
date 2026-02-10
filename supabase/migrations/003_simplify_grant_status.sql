-- Migration: Simplify grant statuses from 9 to 5
-- Removes: idea, research, pending_vote, submitted
-- Keeps: review, approved, paid, declined, closed

BEGIN;

-- Step 1: Migrate existing data to new statuses
UPDATE grants SET status = 'review' WHERE status IN ('idea', 'research', 'pending_vote');
UPDATE grants SET status = 'paid' WHERE status = 'submitted';

-- Step 2: Change column to text temporarily, drop old enum, create new one, swap back
ALTER TABLE grants ALTER COLUMN status TYPE text;

DROP TYPE grant_status;

CREATE TYPE grant_status AS ENUM ('review', 'approved', 'paid', 'declined', 'closed');

ALTER TABLE grants ALTER COLUMN status TYPE grant_status USING status::grant_status;

-- Step 3: Change default from 'idea' to 'review'
ALTER TABLE grants ALTER COLUMN status SET DEFAULT 'review'::grant_status;

COMMIT;
