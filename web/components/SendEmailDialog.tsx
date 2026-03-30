"use client";

import { useState } from "react";
import { partnersApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import type { Partner } from "@/types";
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
  partner: Partner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendEmailDialog({ partner, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) return;

    setLoading(true);
    try {
      await partnersApi.sendEmail(partner.id, {
        subject: form.subject.trim(),
        body: form.body.trim(),
      });
      toast({
        title: t("sendEmail.queued"),
        description: `${partner.email} ${t("sendEmail.queuedDesc")}`,
      });
      setForm({ subject: "", body: "" });
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("sendEmail.sendError"),
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
          <DialogTitle>{t("sendEmail.dialogTitle")} — {partner.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              {t("sendEmail.to")}{" "}
              <span className="font-medium text-foreground">{partner.email}</span>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="e-subject">{t("sendEmail.labelSubject")}</Label>
            <Input
              id="e-subject"
              value={form.subject}
              onChange={(e) =>
                setForm((f) => ({ ...f, subject: e.target.value }))
              }
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="e-body">{t("sendEmail.labelBody")}</Label>
            <Textarea
              id="e-body"
              value={form.body}
              onChange={(e) =>
                setForm((f) => ({ ...f, body: e.target.value }))
              }
              rows={5}
              placeholder={t("sendEmail.bodyPlaceholder")}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("sendEmail.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("sendEmail.sending") : t("sendEmail.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
