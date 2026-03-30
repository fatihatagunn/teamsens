"use client";

import { useState } from "react";
import { meetingsApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMeetingDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    attendees: "", // comma-separated emails
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startTime || !form.endTime) return;

    const attendees = form.attendees
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      await meetingsApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        attendees,
      });
      toast({
        title: t("createMeeting.created"),
        description: t("createMeeting.createdDesc"),
      });
      setForm({ title: "", description: "", startTime: "", endTime: "", attendees: "" });
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("createMeeting.createError"),
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createMeeting.dialogTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-title">{t("createMeeting.labelTitle")}</Label>
            <Input
              id="m-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={t("createMeeting.placeholderTitle")}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-desc">{t("createMeeting.labelDesc")}</Label>
            <Textarea
              id="m-desc"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-start">{t("createMeeting.labelStart")}</Label>
              <Input
                id="m-start"
                type="datetime-local"
                value={form.startTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startTime: e.target.value }))
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-end">{t("createMeeting.labelEnd")}</Label>
              <Input
                id="m-end"
                type="datetime-local"
                value={form.endTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endTime: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-attendees">
              {t("createMeeting.labelAttendees")}{" "}
              <span className="text-xs text-muted-foreground">
                {t("createMeeting.attendeesHint")}
              </span>
            </Label>
            <Input
              id="m-attendees"
              value={form.attendees}
              onChange={(e) =>
                setForm((f) => ({ ...f, attendees: e.target.value }))
              }
              placeholder="fatih@gmail.com, yahya@gmail.com"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("createMeeting.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("createMeeting.creating") : t("createMeeting.createAndGetLink")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
