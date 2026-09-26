import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CATEGORY_ICONS, FALLBACK_ICON } from "../utils/categoryMeta";

interface CategoryInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Category names offered while typing (fuzzy: any substring match). */
  options: string[];
  placeholder?: string;
  /** Classes for the underlying input (match sibling form fields). */
  inputClassName?: string;
  ariaLabel?: string;
  type?: "text" | "search";
  disabled?: boolean;
  /** Extra action when a suggestion is explicitly picked (click / Enter). */
  onPick?: (value: string) => void;
}

/** Bold the typed fragment inside a suggestion. */
function Highlighted({ option, query }: { option: string; query: string }) {
  const q = query.trim().toLowerCase();
  const index = q ? option.toLowerCase().indexOf(q) : -1;
  if (index < 0) return <>{option}</>;
  return (
    <>
      {option.slice(0, index)}
      <mark className="bg-transparent font-semibold text-brand-dark">{option.slice(index, index + q.length)}</mark>
      {option.slice(index + q.length)}
    </>
  );
}

/**
 * Category combobox with as-you-type suggestions (spec: every field that
 * touches categories gets instant suggestions). Free text stays allowed;
 * suggestions appear on focus and refine while typing, with full keyboard
 * support (Arrow keys, Enter, Escape) and 44px+ touch rows on mobile.
 */
export function CategoryInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  inputClassName = "",
  ariaLabel,
  type = "text",
  disabled,
  onPick,
}: CategoryInputProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    // A value that exactly equals an option means "current pick", not a
    // filter: keep showing the full pool so alternatives stay reachable.
    const exact = q !== "" && options.some((option) => option.toLowerCase() === q);
    const pool = q && !exact ? options.filter((option) => option.toLowerCase().includes(q)) : options;
    return pool.slice(0, 7);
  }, [value, options]);

  const showList = open && matches.length > 0;

  // Close when the pointer goes anywhere outside the field.
  useEffect(() => {
    if (!showList) return;
    function handlePointer(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [showList]);

  function pick(option: string) {
    onChange(option);
    onPick?.(option);
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!matches.length) return;
      event.preventDefault();
      setOpen(true);
      setActive((previous) => {
        const next = event.key === "ArrowDown" ? previous + 1 : previous - 1;
        if (next < 0) return matches.length - 1;
        if (next >= matches.length) return 0;
        return next;
      });
    } else if (event.key === "Enter") {
      if (showList && active >= 0) {
        event.preventDefault();
        pick(matches[active]);
      } else if (showList) {
        setOpen(false);
      }
    } else if (event.key === "Escape") {
      if (showList) {
        event.stopPropagation();
        setOpen(false);
      }
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <input
        id={id}
        type={type}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={inputClassName}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Category suggestions"
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-56 overflow-auto rounded-xl border border-line bg-white p-1 shadow-[0_16px_40px_-12px_rgba(16,24,20,0.24)]"
        >
          {matches.map((option, index) => {
            const Icon = CATEGORY_ICONS[option] ?? FALLBACK_ICON;
            return (
              <li
                key={option}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // Keep field focus; plain click then selects.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
                onPointerEnter={() => setActive(index)}
                className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                  index === active ? "bg-brand-soft text-brand-dark" : "text-gray-700"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Icon size={14} />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <Highlighted option={option} query={value} />
                </span>
                {value.trim() && option.toLowerCase() === value.trim().toLowerCase() && (
                  <span className="shrink-0 text-[11px] font-medium text-gray-400">selected</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default CategoryInput;
