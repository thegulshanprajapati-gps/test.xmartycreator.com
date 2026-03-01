import { create } from 'zustand';
import { createId } from '@/utils/helpers';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  kind: ToastKind;
};

type ToastState = {
  items: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (toast) =>
    set((state) => ({
      items: [...state.items, { ...toast, id: createId('toast') }],
    })),
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}));
