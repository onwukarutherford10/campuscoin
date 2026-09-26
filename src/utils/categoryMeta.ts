import {
  Award,
  Banknote,
  BookMarked,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  House,
  Laptop,
  Layers,
  Library,
  Film,
  MonitorPlay,
  Music,
  PawPrint,
  Plane,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export interface CategoryMeta {
  icon: LucideIcon;
  /** Tailwind classes for the small chip behind the icon in list rows. */
  tint: string;
}

/**
 * Real-world line icons per label (fork & knife, bus, house, briefcase...)
 * with restrained slate/emerald chips — matching the design reference.
 */
const META: Record<string, CategoryMeta> = {
  // Spending categories
  Food: { icon: Utensils, tint: "bg-slate-100 text-slate-500" },
  Transport: { icon: Bus, tint: "bg-slate-100 text-slate-500" },
  "Hostel/Rent": { icon: House, tint: "bg-slate-100 text-slate-500" },
  Academics: { icon: GraduationCap, tint: "bg-slate-100 text-slate-500" },
  Subscriptions: { icon: MonitorPlay, tint: "bg-slate-100 text-slate-500" },
  Entertainment: { icon: Film, tint: "bg-slate-100 text-slate-500" },
  Miscellaneous: { icon: ShoppingBag, tint: "bg-slate-100 text-slate-500" },

  // Income sources
  Allowance: { icon: HandCoins, tint: "bg-emerald-50 text-emerald-600" },
  "Part-time job": { icon: Briefcase, tint: "bg-emerald-50 text-emerald-600" },
  Scholarship: { icon: Award, tint: "bg-emerald-50 text-emerald-600" },
  "Gig or freelance work": { icon: Laptop, tint: "bg-emerald-50 text-emerald-600" },
  Gifts: { icon: Gift, tint: "bg-emerald-50 text-emerald-600" },
  "Other income": { icon: Banknote, tint: "bg-emerald-50 text-emerald-600" },

  // Academic levels
  "100 Level": { icon: BookOpen, tint: "bg-slate-100 text-slate-500" },
  "200 Level": { icon: BookMarked, tint: "bg-slate-100 text-slate-500" },
  "300 Level": { icon: Library, tint: "bg-slate-100 text-slate-500" },
  "400 Level": { icon: GraduationCap, tint: "bg-slate-100 text-slate-500" },
  Postgraduate: { icon: Award, tint: "bg-slate-100 text-slate-500" },
  Other: { icon: Layers, tint: "bg-slate-100 text-slate-500" },
};

const FALLBACK: CategoryMeta = { icon: Sparkles, tint: "bg-slate-100 text-slate-500" };

export function getCategoryMeta(label: string): CategoryMeta {
  return META[label] ?? FALLBACK;
}

/** Icon presets offered when creating a personal category (imported, never emoji). */
export const ICON_PRESETS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "Tag", label: "Tag", icon: Tag },
  { key: "Star", label: "Star", icon: Star },
  { key: "Coffee", label: "Coffee", icon: Coffee },
  { key: "Heart", label: "Heart", icon: Heart },
  { key: "Car", label: "Car", icon: Car },
  { key: "Plane", label: "Plane", icon: Plane },
  { key: "Smartphone", label: "Phone", icon: Smartphone },
  { key: "Music", label: "Music", icon: Music },
  { key: "PawPrint", label: "Pet", icon: PawPrint },
  { key: "Shirt", label: "Clothes", icon: Shirt },
];

/**
 * Controlled description → icon mapping (never emoji): the first keyword
 * found in the description wins, e.g. "Flight to Lagos" → Plane even when
 * the category is Transport, "Netflix" → streaming screen, "Campus Cafe" →
 * cutlery. Keys are registered in CATEGORY_ICONS below.
 */
const KEYWORD_ICONS: { keywords: string[]; key: string; icon: LucideIcon }[] = [
  { key: "kw-flight", keywords: ["flight", "airline", "airport", "plane"], icon: Plane },
  { key: "kw-food", keywords: ["restaurant", "cafe", "canteen", "eatery", "lunch", "dinner", "meal", "food", "grocer"], icon: Utensils },
  { key: "kw-ride", keywords: ["uber", "bolt", "taxi", "cab", "ride"], icon: Car },
  { key: "kw-bus", keywords: ["bus", "train", "keke", "fare", "petrol", "fuel"], icon: Bus },
  { key: "kw-hostel", keywords: ["hostel", "rent", "landlord", "accommodation"], icon: House },
  { key: "kw-stream", keywords: ["netflix", "spotify", "showmax", "subscription", "youtube"], icon: MonitorPlay },
  { key: "kw-book", keywords: ["book", "textbook", "handout", "tuition", "print"], icon: BookOpen },
  { key: "kw-allowance", keywords: ["allowance", "pocket money"], icon: HandCoins },
  { key: "kw-scholarship", keywords: ["scholarship", "bursary"], icon: Award },
  { key: "kw-gift", keywords: ["gift", "birthday", "present"], icon: Gift },
];

/**
 * Icon lookup by label, preset key or keyword key. Index this during
 * render — a plain data lookup keeps React's static-components rule happy.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = Object.fromEntries([
  ...Object.entries(META).map(([label, meta]) => [label, meta.icon]),
  ...ICON_PRESETS.map((preset) => [preset.key, preset.icon]),
  ...KEYWORD_ICONS.map((entry) => [entry.key, entry.icon]),
]);

export const FALLBACK_ICON: LucideIcon = Sparkles;

/**
 * Icon key for one transaction: personal preset → description keyword →
 * category label. Returns a plain string; resolve it through
 * CATEGORY_ICONS with FALLBACK_ICON as the default.
 */
export function transactionIconKey(
  description: string,
  categoryLabel: string,
  presetKey?: string | null,
): string {
  if (presetKey && CATEGORY_ICONS[presetKey]) return presetKey;
  const text = description.toLowerCase();
  const hit = KEYWORD_ICONS.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)));
  if (hit) return hit.key;
  return categoryLabel;
}
