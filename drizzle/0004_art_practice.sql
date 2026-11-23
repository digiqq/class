CREATE TABLE zhangfa_practice (
 id INTEGER PRIMARY KEY,
 room_code TEXT NOT NULL REFERENCES zhangfa_rooms(code) ON DELETE CASCADE,
 student_key TEXT NOT NULL,
 work INTEGER NOT NULL CHECK(work IN (0,1)),
 lens TEXT NOT NULL,
 observation TEXT NOT NULL,
 feeling TEXT NOT NULL,
 expression TEXT NOT NULL,
 UNIQUE(room_code,student_key)
);
