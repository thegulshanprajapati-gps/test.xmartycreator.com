'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';

function toReasonText(reason: string) {
  const normalized = reason.trim().toLowerCase();
  if (!normalized) return 'Secure test link invalid hai.';
  if (normalized === 'already_used') return 'Ye link already use ho chuka hai.';
  if (normalized === 'device_mismatch') return 'Ye link sirf original device par chalega.';
  if (normalized === 'expired_token') return 'Ye link expire ho chuka hai.';
  return 'Secure test link corrupt ya invalid hai.';
}

export default function LinkCorruptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = toReasonText(searchParams.get('reason') || '');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/');
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <PageTransition>
      <Card className="mx-auto mt-8 max-w-xl text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <h1 className="mt-3 text-xl font-bold text-slate-900">Link Corrupt</h1>
        <p className="mt-2 text-sm text-slate-600">{reason}</p>
        <p className="mt-1 text-xs text-slate-500">
          Aapko home page par redirect kiya ja raha hai...
        </p>
        <div className="mt-4">
          <Link href="/">
            <Button>Go Home Now</Button>
          </Link>
        </div>
      </Card>
    </PageTransition>
  );
}
