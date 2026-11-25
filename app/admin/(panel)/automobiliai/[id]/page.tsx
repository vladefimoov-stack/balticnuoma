import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { EditorLabels } from "@/components/admin/car-editor/BasicStep";
import { CarEditor } from "@/components/admin/car-editor/CarEditor";
import { requireStaff } from "@/lib/admin/auth";
import { getCarEditor } from "@/lib/admin/cars";
import lt from "@/messages/lt.json";

export const metadata: Metadata = { title: "Automobilis" };

const LABELS: EditorLabels = {
  features: lt.features.items,
  fuel: lt.specs.values.fuel,
  transmission: lt.specs.values.transmission,
  drive: lt.specs.values.drive,
  body: lt.specs.values.body,
};

const STEPS = ["pagrindine", "nuotraukos", "kainos"] as const;

export default async function CarEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ zingsnis?: string }>;
}) {
  const [{ id }, { zingsnis }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const staff = await requireStaff();
  const data = await getCarEditor(staff.supabase, id);
  if (!data) notFound();
  const step = STEPS.find((s) => s === zingsnis) ?? "pagrindine";

  return <CarEditor data={data} labels={LABELS} isAdmin={staff.isAdmin} initialStep={step} />;
}
