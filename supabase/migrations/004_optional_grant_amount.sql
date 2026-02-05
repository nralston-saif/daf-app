-- Make grant amount optional so users can recommend a grant without specifying a dollar amount
ALTER TABLE grants ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE grants ALTER COLUMN amount SET DEFAULT NULL;
