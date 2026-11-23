ALTER TABLE zhangfa_rooms ADD COLUMN course_step INTEGER NOT NULL DEFAULT 0 CHECK(course_step BETWEEN 0 AND 4);
CREATE TABLE zhangfa_structure_answers (
 room_code TEXT NOT NULL REFERENCES zhangfa_rooms(code) ON DELETE CASCADE,
 student_key TEXT NOT NULL,
 answers TEXT NOT NULL,
 PRIMARY KEY(room_code,student_key)
);
