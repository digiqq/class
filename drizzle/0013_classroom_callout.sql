CREATE TABLE zhangfa_callouts (
 room_code TEXT PRIMARY KEY REFERENCES zhangfa_rooms(code) ON DELETE CASCADE,
 student_key TEXT NOT NULL,
 work INTEGER NOT NULL CHECK(work BETWEEN 0 AND 4)
);
CREATE TRIGGER zhangfa_clear_callout_on_phase_change
AFTER UPDATE OF phase ON zhangfa_rooms
WHEN OLD.phase <> NEW.phase
BEGIN
 DELETE FROM zhangfa_callouts WHERE room_code=OLD.code;
END;
