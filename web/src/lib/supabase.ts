import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhhexzchqaanraydnmgh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_DD40Ypi1G-f9kCerDogpVg_xZVjfT4v';

if (!supabaseUrl || (supabaseUrl === 'https://lhhexzchqaanraydnmgh.supabase.co' && !supabaseAnonKey)) {
    console.warn('Supabase credentials are using hardcoded fallbacks.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
