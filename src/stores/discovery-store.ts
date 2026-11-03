import { create } from 'zustand';

/**
 * Lightweight discovery state shared by the homepage search, category rail and
 * (in future) Team Member 4's restaurant listing. Server data stays in React
 * Query; this store only holds UI intent.
 */
interface DiscoveryState {
  search: string;
  categorySlug: string | null;
  setSearch: (search: string) => void;
  setCategory: (slug: string | null) => void;
  reset: () => void;
}

export const useDiscoveryStore = create<DiscoveryState>()((set) => ({
  search: '',
  categorySlug: null,
  setSearch: (search) => set({ search }),
  setCategory: (categorySlug) =>
    set((state) => ({ categorySlug: state.categorySlug === categorySlug ? null : categorySlug })),
  reset: () => set({ search: '', categorySlug: null }),
}));
