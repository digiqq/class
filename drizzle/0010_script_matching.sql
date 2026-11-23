ALTER TABLE zhangfa_rooms ADD COLUMN intro_stage INTEGER NOT NULL DEFAULT 8;
CREATE TABLE zhangfa_script_answers(room_code TEXT NOT NULL REFERENCES zhangfa_rooms(code) ON DELETE CASCADE,student_key TEXT NOT NULL,answers TEXT NOT NULL,PRIMARY KEY(room_code,student_key));
