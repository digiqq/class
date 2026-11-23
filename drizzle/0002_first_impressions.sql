CREATE TABLE zhangfa_first_impressions (
 room_code TEXT NOT NULL REFERENCES zhangfa_rooms(code) ON DELETE CASCADE,
 student_key TEXT NOT NULL,
 findings TEXT NOT NULL,
 feelings TEXT NOT NULL,
 own_finding TEXT NOT NULL,
 own_feeling TEXT NOT NULL,
 impression TEXT NOT NULL,
 PRIMARY KEY (room_code,student_key)
);
