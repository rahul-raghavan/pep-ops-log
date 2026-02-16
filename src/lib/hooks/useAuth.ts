'use client';

import { createClient } from '@/lib/supabase/client';
import { User, Center } from '@/types/database';
import { useEffect, useState } from 'react';

interface AuthState {
  user: User | null;
  centers: Center[];
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    centers: [],
    isLoading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser?.email) {
        setState({ user: null, centers: [], isLoading: false });
        return;
      }

      // Get user from our users table
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (!user) {
        // Sign out orphaned auth session (user not in DB or inactive)
        await supabase.auth.signOut();
        setState({ user: null, centers: [], isLoading: false });
        return;
      }

      // Get user's centers
      let centers: Center[] = [];
      if (user.role === 'super_admin') {
        const { data } = await supabase.from('centers').select('*').order('name');
        centers = data ?? [];
      } else {
        const { data } = await supabase
          .from('user_centers')
          .select('center:centers(*)')
          .eq('user_id', user.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        centers = data?.map((uc: any) => uc.center as Center).filter(Boolean) ?? [];
      }

      setState({ user, centers, isLoading: false });
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return { ...state, signOut };
}
