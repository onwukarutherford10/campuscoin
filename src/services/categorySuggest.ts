// Local, deterministic category suggestions for both mock and live modes.
//
// Section 7 (learning from corrections): when a student picks a different
// category than the one suggested, the choice is remembered and wins over
// the generic rules next time the same words appear. An exact repeat of a
// previously corrected description comes back as "high" confidence so the
// form can pre-select it.

import type { Category, CategorySuggestion, TransactionType } from "../types";
import { delay, loadJSON, saveJSON } from "./store";
import { readCategoriesSync } from "./categoryService";
import { getAuthSnapshot } from "./api/authState";
import { DATA_MODE } from "./api/config";

function correctionsKey(): string {
  const userId = DATA_MODE === "live" ? getAuthSnapshot().user?.id : null;
  return userId ? `campuscoin.corrections.${userId}` : "campuscoin.corrections.mock";
}

interface Correction {
  type: TransactionType;
  text: string;
  category: string;
}

function readCorrections(): Correction[] {
  return loadJSON<Correction[]>(correctionsKey(), []);
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
  saveJSON(correctionsKey(), [...list, { type, text, category: chosen }].slice(-100));
}

/** Learned pick: exact description first, then repeated words. */
function learnedCategory(
  description: string,
  type: TransactionType,
  available: Category[],
): { category: string; confidence: "high" | "medium" } | null {
  const text = description.trim().toLowerCase();
  if (!text) return null;
  const corrections = readCorrections().filter((entry) => entry.type === type);
  const known = new Set(available.filter((entry) => entry.type === type).map((entry) => entry.name));

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
  available: Category[] = readCategoriesSync(),
): Promise<CategorySuggestion | null> {
  const text = description.trim().toLowerCase();
  if (!text) return null;

  try {
    const learned = learnedCategory(description, type, available);
    if (learned) {
      return await delay(
        { category: learned.category, source: "rules", confidence: learned.confidence },
        250,
      );
    }

    const rules = type === "expense" ? EXPENSE_RULES : INCOME_RULES;
    const matches = available.filter((entry) => entry.type === type);
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const direct = matches.find((entry) => normalize(entry.name) && text.includes(normalize(entry.name)));
    if (direct) return await delay({ category: direct.name, source: "rules", confidence: "high" }, 250);
    const rule = rules.find((item) => item.keywords.some((keyword) => text.includes(keyword)));
    if (!rule) return await delay(null, 250);
    const aliases: Record<string, string[]> = {
      "Hostel/Rent": ["housing", "rent"], Academics: ["tuition", "books"],
      Subscriptions: ["data", "airtime"], "Part-time job": ["part time work"],
      "Gig or freelance work": ["other income", "freelance"], Gifts: ["gift"],
      Miscellaneous: ["other expense"],
    };
    const names = [rule.category, ...(aliases[rule.category] ?? [])].map(normalize);
    const match = matches.find((entry) => names.includes(normalize(entry.name)));
    return await delay(match ? { category: match.name, source: "rules", confidence: "medium" } : null, 250);
  } catch {
    // Suggestions never block manual selection.
    return null;
  }
}
