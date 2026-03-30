"use client";

import { useEffect, useState } from "react";
import { meetingsApi } from "@/lib/api";
import type { Meeting } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import {
  Video,
  CalendarCheck,
  Trash2,
  ExternalLink,
  Users,
} from "lucide-react";
import { format } from "date-fns";

export function MeetingList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t, dateLocale } = useI18n();

  const fetchMeetings = async () => {
    try {
      const data = await meetingsApi.list();
      setMeetings(data);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("meetings.loadError"),
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMeetings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await meetingsApi.delete(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      toast({ title: t("meetings.deleted") });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("meetings.deleteError"),
        description: (err as Error).message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        {t("meetings.loading")}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-muted-foreground">
        <CalendarCheck className="mb-2 h-8 w-8" />
        <p className="text-sm">{t("meetings.empty")}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {meetings.map((m) => (
        <li
          key={m.id}
          className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{m.title}</h3>
              {m.description && (
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                  {m.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {format(new Date(m.startTime), "d MMM yyyy HH:mm", {
                    locale: dateLocale,
                  })}{" "}
                  –{" "}
                  {format(new Date(m.endTime), "HH:mm", { locale: dateLocale })}
                </span>
                {m.attendees.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {m.attendees.length} {t("meetings.attendees")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {(m.meetLink || m.hangoutLink) && (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={m.meetLink || m.hangoutLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Video className="mr-1.5 h-3.5 w-3.5" />
                    {t("meetings.join")}
                  </a>
                </Button>
              )}
              {m.htmlLink && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={m.htmlLink} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(m.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
