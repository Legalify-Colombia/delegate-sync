-- Create news images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('news-images', 'news-images', true);

-- Create storage policies for news images
CREATE POLICY "Public can view news images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'news-images');

CREATE POLICY "Press and communications secretary can upload images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'news-images' 
  AND (
    get_user_role(auth.uid()) = 'press'::app_role 
    OR get_user_role(auth.uid()) = 'communications_secretary'::app_role
    OR get_user_role(auth.uid()) = 'admin'::app_role
    OR get_user_role(auth.uid()) = 'secretary_general'::app_role
  )
);

CREATE POLICY "Press and communications secretary can update their images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'news-images' 
  AND (
    get_user_role(auth.uid()) = 'press'::app_role 
    OR get_user_role(auth.uid()) = 'communications_secretary'::app_role
    OR get_user_role(auth.uid()) = 'admin'::app_role
    OR get_user_role(auth.uid()) = 'secretary_general'::app_role
  )
);

CREATE POLICY "Press and communications secretary can delete their images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'news-images' 
  AND (
    get_user_role(auth.uid()) = 'press'::app_role 
    OR get_user_role(auth.uid()) = 'communications_secretary'::app_role
    OR get_user_role(auth.uid()) = 'admin'::app_role
    OR get_user_role(auth.uid()) = 'secretary_general'::app_role
  )
);