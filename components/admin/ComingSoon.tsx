import { Wrench } from "lucide-react";
import { PageHeader } from "./ui";

/** Temporary page for sections built in the next step of phase 6. */
export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-14 text-center">
        <Wrench className="size-8 text-amber" aria-hidden />
        <p className="max-w-md text-sm text-muted">{text}</p>
      </div>
    </>
  );
}
