"use client";

/**
 * TaskList — real-time task list powered by Firestore onSnapshot.
 *
 * The component subscribes to the "tasks" collection when it mounts and
 * automatically reflects every remote change (create / update / delete)
 * without a page reload.
 */

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type QueryConstraint,
  type FirestoreError,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { tasksApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus, TaskDoc } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { MoreHorizontal, Trash2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Bekliyor",
  in_progress: "Devam Ediyor",
  done: "Tamamlandı",
};

const STATUS_VARIANT: Record<
  TaskStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  todo: "secondary",
  in_progress: "default",
  done: "outline",
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: "in_progress",
  in_progress: "done",
  done: null,
};

// ─── Firestore → Task mapper ──────────────────────────────────────────────────

function docToTask(id: string, data: TaskDoc): Task {
  const tsToISO = (ts: Timestamp | undefined) =>
    ts ? ts.toDate().toISOString() : new Date().toISOString();

  return {
    id,
    title: data.title,
    description: data.description,
    status: data.status,
    assigneeId: data.assigneeId,
    dueDate: data.dueDate ? tsToISO(data.dueDate) : undefined,
    createdAt: tsToISO(data.createdAt),
    updatedAt: tsToISO(data.updatedAt),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskListProps {
  statusFilter?: TaskStatus;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskList({ statusFilter }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // ── Firestore real-time subscription ───────────────────────────────────────
  useEffect(() => {
    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
    if (statusFilter) {
      constraints.unshift(where("status", "==", statusFilter));
    }

    const q = query(collection(db, "tasks"), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const updated: Task[] = snapshot.docs.map((doc) =>
          docToTask(doc.id, doc.data() as TaskDoc)
        );
        setTasks(updated);
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        console.error("Firestore snapshot error:", err);
        setError("Görevler yüklenemedi. Lütfen sayfayı yenileyin.");
        setLoading(false);
      }
    );

    // Cleanup: unsubscribe when filter changes or component unmounts
    return unsubscribe;
  }, [statusFilter]);

  // ── Status transition ───────────────────────────────────────────────────────
  const handleAdvanceStatus = useCallback(
    async (task: Task) => {
      const next = NEXT_STATUS[task.status];
      if (!next) return;
      try {
        await tasksApi.update(task.id, { status: next });
        // No local setState needed — onSnapshot picks up the change automatically
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Durum güncellenemedi",
          description: (err as Error).message,
        });
      }
    },
    [toast]
  );

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await tasksApi.delete(id);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Görev silinemedi",
          description: (err as Error).message,
        });
      }
    },
    [toast]
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Yükleniyor…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-muted-foreground">
        <p className="text-sm">Henüz görev yok.</p>
        <p className="text-xs mt-1">Sağ üstten yeni görev ekle.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {tasks.map((task) => (
        <li
          key={task.id}
          className={cn(
            "flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
            task.status === "done" && "opacity-60"
          )}
        >
          {/* Status badge */}
          <Badge
            variant={STATUS_VARIANT[task.status]}
            className="mt-0.5 shrink-0"
          >
            {STATUS_LABEL[task.status]}
          </Badge>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "font-medium leading-snug",
                task.status === "done" && "line-through"
              )}
            >
              {task.title}
            </p>
            {task.description && (
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
            {task.dueDate && (
              <p className="mt-1 text-xs text-muted-foreground">
                Bitiş:{" "}
                {format(new Date(task.dueDate), "d MMM yyyy", { locale: tr })}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {NEXT_STATUS[task.status] && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAdvanceStatus(task)}
                title="Sonraki aşamaya geçir"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Sil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </li>
      ))}
    </ul>
  );
}
