-- Actualizar la política para que staff y press también puedan ver anuncios
DROP POLICY IF EXISTS "All authenticated users can view announcements" ON announcements;

-- Crear nueva política que incluye staff y press
CREATE POLICY "Authenticated users can view announcements" 
ON announcements 
FOR SELECT 
USING (
  auth.role() = 'authenticated'::text AND 
  (
    get_user_role(auth.uid()) = ANY (ARRAY[
      'admin'::app_role, 
      'secretary_general'::app_role, 
      'communications_secretary'::app_role,
      'committee_secretary'::app_role,
      'staff'::app_role,
      'press'::app_role,
      'delegate'::app_role
    ])
  )
);