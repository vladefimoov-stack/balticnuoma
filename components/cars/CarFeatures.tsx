import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { KNOWN_FEATURES, type Feature, type KnownFeature } from "@/lib/db/json";
import { FEATURE_ICONS as ICONS } from "./feature-icons";

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
