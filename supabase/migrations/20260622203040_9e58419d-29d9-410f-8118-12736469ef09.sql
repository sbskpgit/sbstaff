
CREATE POLICY "staff-photos read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'staff-photos');
CREATE POLICY "staff-photos insert auth" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'staff-photos');
CREATE POLICY "staff-photos update auth" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'staff-photos');
CREATE POLICY "staff-photos delete auth" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'staff-photos');
