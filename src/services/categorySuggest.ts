// AI category suggestion integration point (Phase 2, section 6).
//
// The form calls suggestCategory(description, type) while the student types.
// Rules below are the offline fallback so the feature works today; when the
// AI endpoint ships, replace the body with a fetch() call — the signature and
// the UI contract (auto-select when confident, suggestion otherwise) stay.
//
// Section 7 (learning from corrections): when a student picks a different
// category than the one suggested, the choice is remembered and wins over
// the generic rules next time the same words appear. An exact repeat of a
// previously corrected description comes back as "high" confidence so the
// form can pre-select it.

import type { CategorySuggestion, TransactionType } from "../types";
import { delay, loadJSON, saveJSON } from "./store";
import { readCategoriesSync } from "./categoryService";

const CORRECTIONS_KEY = "campuscoin.corrections";

interface Correction {
  type: TransactionType;
  text: string;
  category: string;
}

function readCorrections(): Correction[] {
  return loadJSON<Correction[]>(CORRECTIONS_KEY, []);
}

/** Remembers a manual pick so future suggestions can use it. */
export function recordCorrection(
  description: string,
  type: TransactionType,
  category: string,
): void {
  const text = description.trim().toLowerCase();
  const chosen = category.trim();
  if (!text || !chosen) return;
  const list = readCorrections();
  if (list.some((entry) => entry.type === type && entry.text === text && entry.category === chosen)) {
    return;
  }
  saveJSON(CORRECTIONS_KEY, [...list, { type, text, category: chosen }].slice(-100));
}

/** Learned pick: exact description first, then repeated words. */
function learnedCategory(
  description: string,
  type: TransactionType,
): { category: string; confidence: "high" | "medium" } | null {
  const text = description.trim().toLowerCase();
  if (!text) return null;
  const corrections = readCorrections().filter((entry) => entry.type === type);
  const known = new Set(readCategoriesSync().filter((entry) => entry.type === type).map((entry) => entry.name));

  const exact = corrections.filter((entry) => entry.text === text);
  if (exact.length > 0) {
    const candidate = exact[exact.length - 1].category;
    if (known.has(candidate)) return { category: candidate, confidence: "high" };
  }

  const words = new Set(text.split(/\s+/).filter((word) => word.length > 3));
  const votes = new Map<string, number>();
  for (const entry of corrections) {
    if (![...entry.text.split(/\s+/)].some((word) => words.has(word))) continue;
    if (!known.has(entry.category)) continue;
    votes.set(entry.category, (votes.get(entry.category) ?? 0) + 1);
  }
  const winner = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
  return winner ? { category: winner[0], confidence: "medium" } : null;
}

interface Rule {
  category: string;
  keywords: string[];
}

const EXPENSE_RULES: Rule[] = [
  { category: "Food", keywords: ["cafe", "coffee", "lunch", "dinner", "breakfast", "grocer", "food", "snack", "restaurant", "meal", "pizza", "canteen", "eatery"] },
  { category: "Transport", keywords: ["bus", "uber", "bolt", "taxi", "fuel", "petrol", "transport", "fare", "train", "keke", "flight", "airline", "airport", "ride"] },
  { category: "Hostel/Rent", keywords: ["rent", "hostel", "accommodation", "landlord", "water bill", "light bill", "mess fee"] },
  { category: "Academics", keywords: ["book", "textbook", "print", "handout", "lab", "tuition", "school fee", "exam", "stationery", "projector"] },
  { category: "Subscriptions", keywords: ["subscription", "netflix", "spotify", "showmax", "youtube premium", "airtime", "data bundle", "recharge"] },
  { category: "Entertainment", keywords: ["movie", "cinema", "game", "concert", "club", "show", "event", "party"] },
  { category: "Miscellaneous", keywords: ["laundry", "gift", "repair", "clinic", "pharmacy", "drug", "barber", "haircut"] },
];

const INCOME_RULES: Rule[] = [
  { category: "Allowance", keywords: ["allowance", "pocket money"] },
  { category: "Part-time job", keywords: ["shift", "salary", "wage", "weekend"] },
  { category: "Scholarship", keywords: ["scholarship", "bursary", "grant"] },
  { category: "Gig or freelance work", keywords: ["gig", "freelance", "client", "design"] },
  { category: "Gifts", keywords: ["gift", "birthday", "present"] },
];

/**
 * Suggests a category for a description, or null when nothing matches.
 * Fires on every typing pause — callers must treat results as advisory:
 * "high" may pre-select, everything else is a suggestion the student can
 * accept, ignore or override. A null result never blocks creation.
 */
export async function suggestCategory(
  description: string,
  type: TransactionType,
): Promise<CategorySuggestion | null> {
  const text = description.trim().toLowerCase();
  if (!text) return null;

  try {
    const learned = learnedCategory(description, type);
    if (learned) {
      return await delay(
        { category: learned.category, source: "ai", confidence: learned.confidence },
        250,
      );
    }

    const rules = type === "expense" ? EXPENSE_RULES : INCOME_RULES;
    const match = rules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
    if (!match) return await delay(null, 250);
    return await delay({ category: match.category, source: "rules", confidence: "medium" }, 250);
  } catch {
    // AI unavailable → null. The form simply keeps manual selection.
    return null;
  }
}
