import { createClient } from '@supabase/supabase-js'
import { supabaseUrl } from '@/lib/config'

const url = supabaseUrl
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = url && anonKey
  ? createClient(url, anonKey)
  : null

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  return supabase
}