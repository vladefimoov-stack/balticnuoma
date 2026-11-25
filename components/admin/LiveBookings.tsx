"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Listens to booking changes over Supabase Realtime (RLS: staff only) and refreshes
 * the current admin page, so a new request shows up without reloading. A short
 * notice appears for new requests.
 */
export function LiveBookings() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel("admin-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (payload) => {
        router.refresh();
        if (payload.eventType === "INSERT") {
          setNotice("Gauta nauja užklausa");
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setNotice(null), 6000);
        }
      })
      .subscribe();
    return () => {
      clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50">
      {notice && (
        <p className="rounded-xl border border-pending/40 bg-surface px-4 py-3 text-sm font-medium shadow-card">
          <span className="mr-2 inline-block size-2 rounded-full bg-pending" aria-hidden />
          {notice}
        </p>
      )}
    </div>
  );
}
