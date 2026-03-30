"use client";

import { useState } from "react";
import { MeetingList } from "@/components/MeetingList";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function MeetingsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Toplantılar</h1>
          <p className="mt-1 text-muted-foreground">
            Google Calendar & Meet ile entegre toplantı yönetimi.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Toplantı
        </Button>
      </header>

      <MeetingList />
      <CreateMeetingDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
