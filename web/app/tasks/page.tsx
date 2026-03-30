"use client";

import { useState } from "react";
import { TaskList } from "@/components/TaskList";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TaskStatus } from "@/types";

export default function TasksPage() {
  const { t } = useI18n();
  const [activeStatus, setActiveStatus] = useState<TaskStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const STATUS_TABS: { label: string; value: TaskStatus | "all" }[] = [
    { label: t("tasks.filterAll"), value: "all" },
    { label: t("tasks.filterPending"), value: "todo" },
    { label: t("tasks.filterInProgress"), value: "in_progress" },
    { label: t("tasks.filterDone"), value: "done" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("tasks.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("tasks.description")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("tasks.newTask")}
        </Button>
      </header>

      {/* Status tabs */}
      <div className="mb-6 flex gap-2 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={[
              "border-b-2 pb-2 px-3 text-sm font-medium transition-colors",
              activeStatus === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Real-time task list (uses Firestore onSnapshot internally) */}
      <TaskList statusFilter={activeStatus === "all" ? undefined : activeStatus} />

      <CreateTaskDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
