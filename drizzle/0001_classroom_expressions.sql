CREATE TABLE zhangfa_expressions (
 room_code TEXT NOT NULL REFERENCES zhangfa_rooms(code) ON DELETE CASCADE,
 student_key TEXT NOT NULL,
 work INTEGER NOT NULL CHECK(work BETWEEN 0 AND 4),
 observation TEXT NOT NULL,
 feelings TEXT NOT NULL,
 own_feeling TEXT NOT NULL,
 expression TEXT NOT NULL,
 PRIMARY KEY(room_code, student_key, work)
);
