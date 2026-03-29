import { useCallback, useMemo, useRef } from "react";
import type { SectionList } from "react-native";
import { useUiStore } from "@/src/features/ui/ui.store";

type Item = { key: string; label: string };

export function useSectionNavigator(sections: Item[]) {
  const sectionListRef = useRef<SectionList<any>>(null);
  const routeKey = sections.map((s) => s.key).join("|");
  const activeKey = useUiStore((state) => state.activeSectionByRoute[routeKey] ?? sections[0]?.key ?? "");
  const setActiveSection = useUiStore((state) => state.setActiveSection);

  const onSelect = useCallback((key: string) => {
    const index = sections.findIndex((section) => section.key === key);
    if (index >= 0) {
      sectionListRef.current?.scrollToLocation({ sectionIndex: index, itemIndex: 0, animated: true, viewOffset: 8 });
      setActiveSection(routeKey, key);
    }
  }, [routeKey, sections, setActiveSection]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const visible = viewableItems?.find((item: any) => item?.item?.key);
    if (visible?.item?.key) {
      setActiveSection(routeKey, visible.item.key);
    }
  }).current;

  return useMemo(
    () => ({ activeKey, onSelect, onViewableItemsChanged, sectionListRef }),
    [activeKey, onSelect, onViewableItemsChanged]
  );
}
