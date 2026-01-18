import { createClient } from '@supabase/supabase-js';

// Reusing types if possible, or using any for now
const supabaseUrl = 'https://lhhexzchqaanraydnmgh.supabase.co';
const supabaseAnonKey = 'sb_publishable_DD40Ypi1G-f9kCerDogpVg_xZVjfT4v';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
