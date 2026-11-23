ALTER TABLE zhangfa_rooms ADD COLUMN pen_stage INTEGER NOT NULL DEFAULT 0;
CREATE TABLE zhangfa_pen_matches(id INTEGER PRIMARY KEY,room_code TEXT NOT NULL REFERENCES zhangfa_rooms(code) ON DELETE CASCADE,student_key TEXT NOT NULL,entries TEXT NOT NULL,UNIQUE(room_code,student_key));
