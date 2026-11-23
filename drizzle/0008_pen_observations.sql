CREATE TABLE zhangfa_pen_observations (
 id INTEGER PRIMARY KEY,
 room_code TEXT NOT NULL REFERENCES zhangfa_rooms(code) ON DELETE CASCADE,
 student_key TEXT NOT NULL,
 glyph INTEGER NOT NULL CHECK(glyph BETWEEN 1 AND 5),
 stroke INTEGER NOT NULL CHECK(stroke BETWEEN 1 AND 14),
 feelings TEXT NOT NULL,
 note TEXT NOT NULL,
 UNIQUE(room_code,student_key,glyph,stroke)
);
CREATE INDEX zhangfa_pen_by_glyph ON zhangfa_pen_observations(room_code,glyph);
