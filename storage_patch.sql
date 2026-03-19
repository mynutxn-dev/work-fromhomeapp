-- 1. Create a public bucket for face images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('faces', 'faces', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access to all objects in the bucket
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'faces' );

-- 3. Allow anyone to insert into the bucket (for demo/admin registration purposes)
CREATE POLICY "Public Insert Access" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'faces' );

-- 4. Allow anyone to update/delete (optional for later)
CREATE POLICY "Public Update Access" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'faces' );
CREATE POLICY "Public Delete Access" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'faces' );
