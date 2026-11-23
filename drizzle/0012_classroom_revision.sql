ALTER TABLE zhangfa_rooms ADD COLUMN activity_open INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lanting_expressions ADD COLUMN own_evidence TEXT NOT NULL DEFAULT '';
ALTER TABLE lanting_expressions ADD COLUMN own_feeling TEXT NOT NULL DEFAULT '';
