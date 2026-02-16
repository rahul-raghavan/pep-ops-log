'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface InactivityBannerProps {
  userId: string;
}

export function InactivityBanner({ userId }: InactivityBannerProps) {
  const [show, setShow] = useState(false);
  const [daysSince, setDaysSince] = useState<number | null>(null);

  useEffect(() => {
    // Check if dismissed this session
    if (sessionStorage.getItem('inactivity_banner_dismissed')) {
      return;
    }

    async function check() {
      const supabase = createClient();

      const { data } = await supabase
        .from('observations')
        .select('logged_at')
        .eq('logged_by_user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        // Never logged an observation
        setDaysSince(null);
        setShow(true);
        return;
      }

      const lastLog = new Date(data[0].logged_at);
      const days = Math.floor((Date.now() - lastLog.getTime()) / (1000 * 60 * 60 * 24));

      if (days >= 3) {
        setDaysSince(days);
        setShow(true);
      }
    }

    check();
  }, [userId]);

  function dismiss() {
    sessionStorage.setItem('inactivity_banner_dismissed', 'true');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-amber-800 font-medium">
          {daysSince === null
            ? "You haven't logged any observations yet."
            : `It's been ${daysSince} days since your last observation.`}
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Regular observations help track staff performance.
        </p>
        <Link href="/observations/new">
          <Button size="sm" variant="outline" className="mt-2 text-amber-700 border-amber-300 hover:bg-amber-100">
            Log Observation
          </Button>
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="text-amber-400 hover:text-amber-600 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
