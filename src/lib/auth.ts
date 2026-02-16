import { createClient } from '@/lib/supabase/server';
import { User } from '@/types/database';

// Allowed domains for Google OAuth
export const ALLOWED_DOMAINS = [
  'pepschoolv2.com',
  'accelschool.in',
  'ribbons.education',
];

export function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  // Check if email domain is allowed
  if (!isAllowedDomain(authUser.email)) {
    return null;
  }

  // Get user from our users table
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', authUser.email.toLowerCase())
    .eq('is_active', true)
    .single();

  return user;
}

export async function getUserCenters(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_centers')
    .select('center_id')
    .eq('user_id', userId);

  return data?.map((uc) => uc.center_id) ?? [];
}

export async function canAccessCenter(
  userId: string,
  centerId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === 'super_admin') return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from('user_centers')
    .select('id')
    .eq('user_id', userId)
    .eq('center_id', centerId)
    .single();

  return !!data;
}

export async function canViewSubject(
  userId: string,
  subjectId: string,
  linkedSubjectId: string | null
): Promise<boolean> {
  // If user is linked to this subject, they cannot view it (self-visibility restriction)
  if (linkedSubjectId === subjectId) {
    return false;
  }
  return true;
}
