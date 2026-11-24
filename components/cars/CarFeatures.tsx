import {
  Armchair,
  Baby,
  Bluetooth,
  Camera,
  Cog,
  Fan,
  Flame,
  Gauge,
  KeyRound,
  Leaf,
  Link as LinkIcon,
  Navigation,
  Radar,
  Smartphone,
  Snowflake,
  Sparkles,
  Sun,
  Usb,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { KNOWN_FEATURES, type Feature, type KnownFeature } from "@/lib/db/json";

const ICONS: Record<string, LucideIcon> = {
  snowflake: Snowflake,
  navigation: Navigation,
  flame: Flame,
  fan: Fan,
  smartphone: Smartphone,
  bluetooth: Bluetooth,
  usb: Usb,
  sun: Sun,
  gauge: Gauge,
  camera: Camera,
  radar: Radar,
  "key-round": KeyRound,
  armchair: Armchair,
  cog: Cog,
  leaf: Leaf,
  baby: Baby,
  link: LinkIcon,
};

const isKnown = (key: string): key is KnownFeature => key in KNOWN_FEATURES;

/** Equipment list with icons. Known keys are translated; custom ones carry their own labels. */
export async function CarFeatures({ features, locale }: { features: Feature[]; locale: string }) {
  const t = await getTranslations("features");
  if (features.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {features.map((f) => {
        const known = isKnown(f.key);
        const iconName = known ? KNOWN_FEATURES[f.key as KnownFeature] : f.icon;
        const Icon = (iconName && ICONS[iconName]) || Sparkles;
        const label = known
          ? t(`items.${f.key as KnownFeature}`)
          : (locale === "en" && f.label_en) || f.label_lt || f.key;
        return (
          <li
            key={f.key}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm"
          >
            <Icon className="size-5 shrink-0 text-amber/80" aria-hidden />
            {label}
          </li>
        );
      })}
    </ul>
  );
}
