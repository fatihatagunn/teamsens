"use client";

import { useEffect, useState, useCallback } from "react";
import { partnersApi } from "@/lib/api";
import type { Partner, PartnerStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import { SendEmailDialog } from "@/components/SendEmailDialog";
import { MoreHorizontal, Mail, Trash2 } from "lucide-react";

const STATUS_VARIANT: Record<
  PartnerStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  prospect: "secondary",
  active: "default",
  inactive: "outline",
};

export function PartnerList() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailTarget, setEmailTarget] = useState<Partner | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  const fetchPartners = useCallback(async () => {
    try {
      const data = await partnersApi.list();
      setPartners(data);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("partners.loadError"),
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void fetchPartners();
  }, [fetchPartners]);

  const handleStatusChange = async (id: string, status: PartnerStatus) => {
    try {
      const updated = await partnersApi.updateStatus(id, status);
      setPartners((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast({ title: t("partners.statusUpdated") });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("partners.updateError"),
        description: (err as Error).message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await partnersApi.delete(id);
      setPartners((prev) => prev.filter((p) => p.id !== id));
      toast({ title: t("partners.deleted") });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("partners.deleteError"),
        description: (err as Error).message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        {t("partners.loading")}
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-muted-foreground">
        <p className="text-sm">{t("partners.empty")}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {partners.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.email}</p>
              {p.contactName && (
                <p className="text-xs text-muted-foreground">
                  {t("partners.contact")} {p.contactName}
                </p>
              )}
            </div>

            <Badge variant={STATUS_VARIANT[p.status]}>
              {t(`partners.statusLabel.${p.status}`)}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEmailTarget(p)}>
                  <Mail className="mr-2 h-4 w-4" />
                  {t("partners.sendEmail")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {(["prospect", "active", "inactive"] as PartnerStatus[])
                  .filter((s) => s !== p.status)
                  .map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => handleStatusChange(p.id, s)}
                    >
                      {t(`partners.statusAction.${s}`)}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDelete(p.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("partners.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

      {emailTarget && (
        <SendEmailDialog
          partner={emailTarget}
          open={!!emailTarget}
          onOpenChange={(open) => !open && setEmailTarget(null)}
        />
      )}
    </>
  );
}
