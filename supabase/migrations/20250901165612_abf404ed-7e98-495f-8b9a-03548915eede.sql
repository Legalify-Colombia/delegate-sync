-- Create attendance registry table for staff to track delegate check-ins
CREATE TABLE public.attendance_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delegate_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attendance_registry ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance registry
CREATE POLICY "Staff can view all attendance records" 
ON public.attendance_registry 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['staff'::app_role, 'admin'::app_role, 'secretary_general'::app_role]));

CREATE POLICY "Staff can create attendance records" 
ON public.attendance_registry 
FOR INSERT 
WITH CHECK (
  get_user_role(auth.uid()) = ANY (ARRAY['staff'::app_role, 'admin'::app_role, 'secretary_general'::app_role])
  AND staff_id = auth.uid()
);

CREATE POLICY "Staff can update their own attendance records" 
ON public.attendance_registry 
FOR UPDATE 
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['staff'::app_role, 'admin'::app_role, 'secretary_general'::app_role])
  AND staff_id = auth.uid()
);

-- Delegates can view their own attendance records
CREATE POLICY "Delegates can view their own attendance records" 
ON public.attendance_registry 
FOR SELECT 
USING (delegate_id = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attendance_registry_updated_at
BEFORE UPDATE ON public.attendance_registry
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_attendance_registry_delegate_id ON public.attendance_registry(delegate_id);
CREATE INDEX idx_attendance_registry_staff_id ON public.attendance_registry(staff_id);
CREATE INDEX idx_attendance_registry_check_in_time ON public.attendance_registry(check_in_time DESC);