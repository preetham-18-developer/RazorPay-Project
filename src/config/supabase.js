const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uuucqcugqzadaudzylao.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1dWNxY3VncXphZGF1ZHp5bGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTI1MDIsImV4cCI6MjEwNDE2ODUwMn0.U7PTZG3xbFaqS-B2ObQd6m0TT5wf1RaP2WRPL8hk68I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  }
});

module.exports = {
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
};
