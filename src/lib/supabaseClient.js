import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Supports both the new "publishable" key name and the older "anon" key name.
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Fail loudly instead of the app silently breaking on every request.
  throw new Error(
    "Missing Supabase configuration. Set VITE_SUPABASE_URL and " +
      "VITE_SUPABASE_PUBLISHABLE_KEY in your .env file, then restart the dev server."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
