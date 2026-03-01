'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { ADMIN_NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/utils/helpers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { globalAdminSearch } from '@/services/search-service';
import { useAuthStore } from '@/store/auth-store';
import { useToastStore } from '@/store/toast-store';

type SearchItem = {
  id: string;
  label: string;
  type: string;
  href: string;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const isLiveMode = () => {
  const raw = (process.env.NEXT_PUBLIC_IS_LIVE || '').trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return process.env.NODE_ENV === 'production';
};

const resolveMainProjectBaseUrl = () => {
  const liveBase = trimTrailingSlash(
    process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://xmartycreator.com'
  );
  const localBase = trimTrailingSlash(
    process.env.NEXT_PUBLIC_MAIN_SITE_LOCAL_URL || 'http://localhost:3000'
  );
  return isLiveMode() ? liveBase : localBase;
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const pushToast = useToastStore((state) => state.push);

  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setSearchItems([]);
      return;
    }
    setSearching(true);
    globalAdminSearch(query)
      .then((items) => {
        if (!active) return;
        setSearchItems(items as SearchItem[]);
      })
      .finally(() => {
        if (active) setSearching(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  const onLogout = async () => {
    await logout();
    pushToast({ kind: 'info', title: 'Logged out successfully' });
    window.location.assign(resolveMainProjectBaseUrl());
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    if (searchItems[0]) {
      router.push(searchItems[0].href);
      setQuery('');
      setSearchItems([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white p-4 transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="mb-6 flex items-center justify-between lg:justify-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Test Management
            </p>
            <h2 className="text-lg font-bold text-slate-900">Admin Panel</h2>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-xl px-3 py-2 text-sm font-medium transition',
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? 'bg-blue-600 text-white shadow-glass'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
            <button
              className="rounded-lg border border-slate-200 p-2 lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={16} />
            </button>

            <form className="relative flex-1" onSubmit={onSearch}>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Search students, tests, questions..."
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <div className="absolute top-11 z-40 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {searching ? (
                    <p className="px-2 py-2 text-xs text-slate-500">Searching...</p>
                  ) : searchItems.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-slate-500">No matches found.</p>
                  ) : (
                    searchItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          router.push(item.href);
                          setQuery('');
                          setSearchItems([]);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="text-xs text-slate-400">{item.type}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </form>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.name ?? 'Admin'}</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
