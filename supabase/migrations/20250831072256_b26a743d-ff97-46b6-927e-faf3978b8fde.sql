-- Crear foreign key constraint entre announcements y profiles
ALTER TABLE announcements 
ADD CONSTRAINT fk_announcements_author 
FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;