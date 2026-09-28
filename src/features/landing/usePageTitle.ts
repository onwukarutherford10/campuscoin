import { useEffect } from "react";

const DEFAULT_TITLE = "Campus Coin";

/**
 * Sets `document.title` while a page is mounted and restores the default on
 * unmount, so each route owns its own browser/tab title.
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}

export default usePageTitle;
