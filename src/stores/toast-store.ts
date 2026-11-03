import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  notify: (input: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  notify: (input) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { ...input, id }] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function useToast() {
  const notify = useToastStore((state) => state.notify);
  return notify;
}
