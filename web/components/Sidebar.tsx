"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CheckSquare, CalendarDays, Handshake, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const NAV_ITEMS = [
    { href: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
    { href: "/tasks", icon: CheckSquare, label: t("nav.tasks") },
    { href: "/meetings", icon: CalendarDays, label: t("nav.meetings") },
    { href: "/partners", icon: Handshake, label: t("nav.partners") },
  ] as const;

  return (
    <aside className="flex w-56 flex-col border-r bg-card px-3 py-6">
      {/* Logo / Brand */}
      <div className="mb-8 px-3">
        <span className="text-lg font-bold tracking-tight text-primary">
          TeamSens
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {/* Language switcher */}
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {(["en", "tr"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={cn(
                "flex-1 rounded-md py-1 text-xs font-medium transition-colors",
                locale === l
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* User info + logout */}
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 px-1 py-1">
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName ?? ""}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-primary/20" />
            )}
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {user?.displayName ?? user?.email}
            </span>
            <button
              onClick={signOut}
              title={t("nav.signOut")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
