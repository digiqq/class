ALTER TABLE zhangfa_rooms ADD COLUMN lanting_round INTEGER NOT NULL DEFAULT 1 CHECK(lanting_round BETWEEN 1 AND 5);
CREATE TABLE lanting_expressions (
 id INTEGER PRIMARY KEY,
 room_code TEXT NOT NULL REFERENCES zhangfa_rooms(code) ON DELETE CASCADE,
 student_key TEXT NOT NULL,
 version TEXT NOT NULL CHECK(version IN ('feng','yu','chu')),
 evidence TEXT NOT NULL,
 feelings TEXT NOT NULL,
 UNIQUE(room_code,student_key,version)
);
CREATE INDEX lanting_by_version ON lanting_expressions(room_code,version);
