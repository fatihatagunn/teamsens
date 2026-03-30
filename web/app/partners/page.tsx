"use client";

import { useState } from "react";
import { PartnerList } from "@/components/PartnerList";
import { CreatePartnerDialog } from "@/components/CreatePartnerDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function PartnersPage() {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("partners.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("partners.description")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("partners.newPartner")}
        </Button>
      </header>

      <PartnerList />
      <CreatePartnerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
