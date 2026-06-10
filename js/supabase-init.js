const SUPABASE_URL = 'https://qyoortkrlfxzuzjxwfge.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5b29ydGtybGZ4enV6anh3ZmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjkyNjEsImV4cCI6MjA5NjY0NTI2MX0.B0CY8sKEaehSQp2BwUGZ5jABYHwjcBy9cS2I8fEeXso'

const { createClient } = supabase
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
