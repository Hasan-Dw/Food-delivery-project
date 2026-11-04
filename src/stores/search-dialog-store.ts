import { create } from 'zustand';

/**
 * Search dialog visibility. Kept separate from the discovery filters so any
 * surface (navbar, mobile menu, keyboard shortcut) can open the same dialog
 * without owning search state.
 */
interface SearchDialogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useSearchDialogStore = create<SearchDialogState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
