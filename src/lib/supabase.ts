import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://diuqqgbldqmokhthvjsx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdXFxZ2JsZHFtb2todGh2anN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTc5MzAsImV4cCI6MjA3OTg3MzkzMH0.hKevs2cIM77XvQZx7otJoq_eGrR7JJFhi-KWPfZLqWU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
