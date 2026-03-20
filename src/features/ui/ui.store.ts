import { create } from "zustand";

type UiStore = {
  activeSectionByRoute: Record<string, string>;
  scrollOffsetByRoute: Record<string, number>;
  setActiveSection: (route: string, section: string) => void;
  setScrollOffset: (route: string, offset: number) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeSectionByRoute: {},
  scrollOffsetByRoute: {},
  setActiveSection: (route, section) =>
    set((state) => ({ activeSectionByRoute: { ...state.activeSectionByRoute, [route]: section } })),
  setScrollOffset: (route, offset) =>
    set((state) => ({ scrollOffsetByRoute: { ...state.scrollOffsetByRoute, [route]: offset } }))
}));
