import { describe, it, expect } from 'vitest';
import { readSupabaseConfig } from './supabase';

describe('readSupabaseConfig', () => {
  it('returns the trimmed URL and key', () => {
    expect(
      readSupabaseConfig({ VITE_SUPABASE_URL: ' https://abc.supabase.co ', VITE_SUPABASE_ANON_KEY: ' key ' }),
    ).toEqual({ url: 'https://abc.supabase.co', key: 'key' });
  });

  it.each([
    [{}],
    [{ VITE_SUPABASE_URL: 'https://abc.supabase.co' }],
    [{ VITE_SUPABASE_ANON_KEY: 'key' }],
    [{ VITE_SUPABASE_URL: '  ', VITE_SUPABASE_ANON_KEY: 'key' }],
    [{ VITE_SUPABASE_URL: 'not a url', VITE_SUPABASE_ANON_KEY: 'key' }],
    [{ VITE_SUPABASE_URL: 'http://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'key' }],
  ])('is off (null) for %j', env => {
    expect(readSupabaseConfig(env)).toBeNull();
  });
});
