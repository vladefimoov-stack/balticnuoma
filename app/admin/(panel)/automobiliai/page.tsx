import { CalendarCheck, Copy, ExternalLink, ImageIcon, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CarPlaceholder } from "@/components/cars/CarPlaceholder";
import { CarStatusBadge, EmptyState, Notice, PageHeader } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { requireStaff } from "@/lib/admin/auth";
import { createDraftCar, duplicateCar } from "@/lib/admin/car-actions";
import { DeleteCarButton, RestoreCarButton } from "@/components/admin/CarRowActions";
import { listCars } from "@/lib/admin/cars";

export const metadata: Metadata = { title: "Automobiliai" };

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<{ istrinta?: string; archyvuota?: string; archyvas?: string }>;
}) {
  const { istrinta, archyvuota, archyvas } = await searchParams;
  const staff = await requireStaff();
  const all = await listCars(staff.supabase);
  const showArchive = Boolean(archyvas);
  const archivedCount = all.filter((c) => c.archived).length;
  const cars = all.filter((c) => c.archived === showArchive);

  return (
    <>
      <PageHeader
        title={showArchive ? "Ištrinti automobiliai" : "Automobiliai"}
        description={
          showArchive
            ? "Automobiliai, kurie buvo ištrinti, bet turėjo rezervacijų — saugomi istorijai. Svetainėje ir sąrašuose nerodomi."
            : "Bet kokios markės ir klasės automobiliai. Juodraščiai svetainėje nerodomi."
        }
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
          Automobilis ištrintas kartu su nuotraukomis.
        </Notice>
      )}
      {archyvuota && (
        <Notice tone="success" className="mb-5">
          Automobilis ištrintas iš svetainės ir sąrašų. Jis turėjo rezervacijų, todėl jų istorija išsaugota — jį rasite
          skiltyje „Ištrinti automobiliai“.
        </Notice>
      )}
      {(archivedCount > 0 || showArchive) && (
        <Link
          href={showArchive ? "/admin/automobiliai" : "/admin/automobiliai?archyvas=1"}
          className="mb-5 inline-flex text-sm text-muted underline hover:text-fg"
        >
          {showArchive ? "← Aktyvūs automobiliai" : `Ištrinti automobiliai (${archivedCount})`}
        </Link>
      )}

      {cars.length === 0 ? (
        <EmptyState>
          {showArchive ? "Ištrintų automobilių nėra." : "Automobilių dar nėra. Spauskite „Pridėti automobilį“."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cars.map((car, index) => (
            <li key={car.id} className="flex flex-col rounded-card border border-line bg-surface">
              <Link
                href={`/admin/automobiliai/${car.id}`}
                className="relative block aspect-[16/9] overflow-hidden rounded-t-card bg-surface-2"
              >
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
                <div className="mt-auto flex flex-nowrap items-center gap-1.5">
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
                      className={buttonClasses({ variant: "ghost", size: "sm", className: "px-2.5" })}
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
                      className={buttonClasses({ variant: "ghost", size: "sm", className: "px-2.5" })}
                      aria-label={`${car.title} svetainėje`}
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                  {car.archived ? (
                    staff.isAdmin && <RestoreCarButton carId={car.id} />
                  ) : (
                    <span className="ml-auto">
                      <DeleteCarButton carId={car.id} title={car.title} compact canDelete={staff.isAdmin} />
                    </span>
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
