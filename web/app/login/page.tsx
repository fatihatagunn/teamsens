"use client";

import { Chrome } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const { t } = useI18n();

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-10 shadow-sm w-80">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-primary">TeamSens</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>
        <Button onClick={signInWithGoogle} className="w-full gap-2">
          <Chrome className="h-4 w-4" />
          {t("login.signInWithGoogle")}
        </Button>
      </div>
    </div>
  );
}
