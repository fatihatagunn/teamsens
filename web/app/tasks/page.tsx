"use client";

import { useState } from "react";
import { TaskList } from "@/components/TaskList";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { TaskStatus } from "@/types";

const STATUS_TABS: { label: string; value: TaskStatus | "all" }[] = [
  { label: "Tümü", value: "all" },
  { label: "Bekliyor", value: "todo" },
  { label: "Devam Ediyor", value: "in_progress" },
  { label: "Tamamlandı", value: "done" },
];

export default function TasksPage() {
  const [activeStatus, setActiveStatus] = useState<TaskStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Görevler</h1>
          <p className="mt-1 text-muted-foreground">
            Firestore anlık dinleme ile senkronize görev listesi.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Görev
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
