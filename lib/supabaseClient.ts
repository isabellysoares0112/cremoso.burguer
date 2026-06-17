import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv } from './supabaseEnv'

const { url, anonKey } = getSupabasePublicEnv()

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
  },
})
