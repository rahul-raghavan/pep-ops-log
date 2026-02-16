import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ALLOWED_DOMAINS } from '@/lib/auth';

function sanitizeRedirectPath(path: string): string {
  // Only allow relative paths starting with /
  // Block protocol-relative URLs (//) and absolute URLs (://)
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return '/dashboard';
  }
  return path;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeRedirectPath(searchParams.get('next') ?? '/dashboard');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Handle error
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      // Check if email domain is allowed
      const domain = data.user.email.split('@')[1]?.toLowerCase();
      if (!ALLOWED_DOMAINS.includes(domain)) {
        // Sign out the user if domain is not allowed
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?error=unauthorized_domain`
        );
      }

      // Check if user exists in our users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, is_active')
        .eq('email', data.user.email.toLowerCase())
        .single();

      if (!existingUser) {
        // User not in system
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=not_registered`);
      }

      if (!existingUser.is_active) {
        // User is deactivated
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=deactivated`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
