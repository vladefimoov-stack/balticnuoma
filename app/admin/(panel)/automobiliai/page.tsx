import { CalendarCheck, Copy, ExternalLink, ImageIcon, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CarPlaceholder } from "@/components/cars/CarPlaceholder";
import { CarStatusBadge, EmptyState, Notice, PageHeader } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { requireStaff } from "@/lib/admin/auth";
import { createDraftCar, duplicateCar } from "@/lib/admin/car-actions";
import { listCars } from "@/lib/admin/cars";

export const metadata: Metadata = { title: "Automobiliai" };

export default async function CarsPage({ searchParams }: { searchParams: Promise<{ istrinta?: string }> }) {
  const { istrinta } = await searchParams;
  const staff = await requireStaff();
  const cars = await listCars(staff.supabase);

  return (
    <>
      <PageHeader
        title="Automobiliai"
        description="Bet kokios markės ir klasės automobiliai. Juodraščiai svetainėje nerodomi."
        actions={
          <form action={createDraftCar}>
            <button type="submit" className={buttonClasses({ size: "sm" })}>
              <Plus className="size-4" aria-hidden />
              Pridėti automobilį
            </button>
          </form>
        }
      />
      {istrinta && (
        <Notice tone="success" className="mb-5">
          Automobilis ištrintas.
        </Notice>
      )}

      {cars.length === 0 ? (
        <EmptyState>Automobilių dar nėra. Spauskite „Pridėti automobilį“.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cars.map((car, index) => (
            <li key={car.id} className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
              <Link href={`/admin/automobiliai/${car.id}`} className="relative block aspect-[16/9] bg-surface-2">
                {car.cover ? (
                  <Image
                    src={car.cover}
                    priority={index < 3}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid h-full place-items-center px-8">
                    <CarPlaceholder bodyType={null} className="max-w-56 opacity-70" />
                  </span>
                )}
                <span className="absolute top-3 left-3">
                  <CarStatusBadge status={car.status} />
                </span>
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <Link href={`/admin/automobiliai/${car.id}`} className="font-semibold hover:text-amber">
                    {car.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {[car.category, car.plate, car.year].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <ImageIcon className="size-3.5" aria-hidden /> {car.photos} nuotr.
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarCheck className="size-3.5" aria-hidden /> {car.upcoming} būsimos rez. / užkl.
                  </span>
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href={`/admin/automobiliai/${car.id}`}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    Redaguoti
                  </Link>
                  <form action={duplicateCar.bind(null, car.id)}>
                    <button
                      type="submit"
                      className={buttonClasses({ variant: "ghost", size: "sm" })}
                      title="Sukurti kopiją (juodraštį)"
                    >
                      <Copy className="size-3.5" aria-hidden />
                      Dubliuoti
                    </button>
                  </form>
                  {car.status === "published" && (
                    <a
                      href={`/automobiliai/${car.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses({ variant: "ghost", size: "sm" })}
                      aria-label={`${car.title} svetainėje`}
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
