import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhhexzchqaanraydnmgh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_DD40Ypi1G-f9kCerDogpVg_xZVjfT4v';

if (!supabaseUrl || (supabaseUrl === 'https://lhhexzchqaanraydnmgh.supabase.co' && !supabaseAnonKey)) {
    console.warn('Supabase credentials are using hardcoded fallbacks.');
}

// Using untyped client - the codebase uses `any[]` for all state,
// so strict Database generics cause widespread 'never' type errors.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
