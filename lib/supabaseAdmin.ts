import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceRoleKey) {
  // It's intentional to not throw here so the app can still run in read-only mode
  // during development if service role isn't provided. Server routes that need
  // the service role will return a helpful error.
  console.warn('NEXT_SUPABASE_SERVICE_ROLE_KEY is not set. Server-side writes will fail.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabaseAdmin;
