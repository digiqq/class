CREATE TABLE zhangfa_review_impressions (
 room_code TEXT NOT NULL REFERENCES zhangfa_rooms(code) ON DELETE CASCADE,
 student_key TEXT NOT NULL,
 review TEXT NOT NULL,
 reason TEXT NOT NULL,
 PRIMARY KEY (room_code,student_key)
);
