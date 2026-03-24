import { useMemo } from "react";
import { useUiStore } from "@/src/features/ui/ui.store";

export function useRestoreScrollPosition(routeKey: string) {
  const initialOffset = useUiStore((state) => state.scrollOffsetByRoute[routeKey] ?? 0);
  const setScrollOffset = useUiStore((state) => state.setScrollOffset);

  return useMemo(
    () => ({
      initialOffset,
      onScroll: (offsetY: number) => setScrollOffset(routeKey, offsetY)
    }),
    [initialOffset, routeKey, setScrollOffset]
  );
}
