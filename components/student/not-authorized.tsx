import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function NotAuthorized({
  title = 'Not Authorized',
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <Card className="mx-auto max-w-2xl text-center">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <div className="mt-4">
        <Link href="/student/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </Card>
  );
}
