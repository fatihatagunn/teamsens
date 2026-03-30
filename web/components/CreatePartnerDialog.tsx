"use client";

import { useState } from "react";
import { partnersApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
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

export function CreatePartnerDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    contactName: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    setLoading(true);
    try {
      await partnersApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        contactName: form.contactName.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast({ title: "Partner eklendi" });
      setForm({ name: "", email: "", contactName: "", notes: "" });
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Partner eklenemedi",
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
          <DialogTitle>Yeni Partner</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-name">Şirket / Kişi Adı *</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-email">E-posta *</Label>
            <Input
              id="p-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-contact">İletişim Kişisi</Label>
            <Input
              id="p-contact"
              value={form.contactName}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactName: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-notes">Notlar</Label>
            <Textarea
              id="p-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Ekleniyor…" : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
