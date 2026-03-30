import Link from "next/link";
import {
  CheckSquare,
  CalendarDays,
  Handshake,
  ArrowRight,
} from "lucide-react";

const tiles = [
  {
    href: "/tasks",
    icon: CheckSquare,
    title: "Görevler",
    description: "Ekip görevlerini yönet, durumları anlık takip et.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    href: "/meetings",
    icon: CalendarDays,
    title: "Toplantılar",
    description: "Google Calendar & Meet entegrasyonuyla toplantı planla.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    href: "/partners",
    icon: Handshake,
    title: "Partnerler",
    description: "Partner ilişkilerini takip et, e-posta gönder.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Ekip yönetim paneline hoşgeldin.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map(({ href, icon: Icon, title, description, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-4 rounded-xl border p-6 transition-shadow hover:shadow-md"
          >
            <div className={`w-fit rounded-lg p-2 ${bg}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <ArrowRight className="mt-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
