'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Store,
  ShoppingBag,
  Package,
  User,
  Info,
  LayoutDashboard,
} from 'lucide-react';

const TABS = [
  {
    href: '/bazaar',
    label: 'bazaar',
    icon: Store,
    hindi: 'बाज़ार',
  },
  {
    href: '/thaila',
    label: 'thaila',
    icon: ShoppingBag,
    hindi: 'थैला',
  },
  {
    href: '/kharid',
    label: 'kharid',
    icon: Package,
    hindi: 'खरीद',
  },
  {
    href: '/khata',
    label: 'khata',
    icon: User,
    hindi: 'खाता',
  },
  {
    href: '/parichay',
    label: 'parichay',
    icon: Info,
    hindi: 'परिचय',
  },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  return (
    <nav
      className="tab-bar flex h-16 items-center justify-around px-2 pb-safe sm:hidden"
      role="tablist"
      aria-label="Main navigation"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            aria-label={t(tab.label)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
              'rounded-lg min-w-[60px]',
              isActive
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="font-hindi">{t(tab.label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DesktopTabBar() {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  return (
    <nav
      className="hidden sm:flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-1">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              aria-label={t(tab.label)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                'rounded-lg',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="font-hindi hidden sm:inline">{t(tab.label)}</span>
            </Link>
          );
        })}
      </div>

      {/* User menu / notifications would go here */}
      <div className="flex items-center gap-2">
        {/* Placeholder for user avatar, notifications, etc. */}
      </div>
    </nav>
  );
}