import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdminEnv } from './supabaseEnv'

const { url, serviceRoleKey } = getSupabaseAdminEnv()

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
