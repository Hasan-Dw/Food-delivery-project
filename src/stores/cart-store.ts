import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, SelectedOption } from '@/types';
import { PREVIEW_COUPONS, evaluatePreviewCoupon } from '@/mocks/services/preview-coupons';

interface AddProductInput {
  product: Product;
  restaurantName: string;
  deliveryFee?: number;
  quantity?: number;
  selectedOptions?: SelectedOption[];
  notes?: string;
}

interface CartState {
  restaurantId: string | null;
  restaurantName: string | null;
  deliveryFee: number;
  items: CartItem[];
  couponCode: string | null;
  addProduct: (input: AddProductInput) => { replacedRestaurant: boolean };
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  applyCoupon: (code: string) => boolean;
  /** Store a server-validated code (or clear it). */
  setCoupon: (code: string | null) => void;
  removeCoupon: () => void;
  clear: () => void;
}

function signature(productId: string, selectedOptions: SelectedOption[] = []): string {
  return [productId, ...selectedOptions.map((option) => option.optionId).sort()].join('|');
}

const COUPONS = PREVIEW_COUPONS;

/**
 * Shared cart state.
 *
 * Team Member 2 owns the cart & checkout pages. This store is the shared
 * boundary they extend — it intentionally contains no UI.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      deliveryFee: 0,
      items: [],
      couponCode: null,

      addProduct: ({ product, restaurantName, deliveryFee = 0, quantity = 1, selectedOptions = [], notes }) => {
        const current = get();
        const replacedRestaurant =
          current.restaurantId !== null && current.restaurantId !== product.restaurantId;

        const optionDelta = selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);
        const unitPrice = Math.round((product.price + optionDelta) * 100) / 100;
        const newItem: CartItem = {
          id: `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          productId: product.id,
          restaurantId: product.restaurantId,
          name: product.name,
          imageKey: product.imageKey,
          unitPrice,
          quantity,
          selectedOptions,
          notes,
        };

        const baseItems = replacedRestaurant ? [] : current.items;
        const existing = baseItems.find(
          (item) =>
            item.productId === product.id &&
            signature(item.productId, item.selectedOptions) === signature(product.id, selectedOptions),
        );

        const items: CartItem[] = existing
          ? baseItems.map((item) =>
              item.id === existing.id
                ? { ...item, quantity: Math.min(20, item.quantity + quantity) }
                : item,
            )
          : [...baseItems, newItem];

        set({
          items,
          restaurantId: product.restaurantId,
          restaurantName,
          deliveryFee,
          couponCode: replacedRestaurant ? null : current.couponCode,
        });

        return { replacedRestaurant };
      },

      removeItem: (itemId) =>
        set((state) => {
          const items = state.items.filter((item) => item.id !== itemId);
          return items.length
            ? { items }
            : { items: [], restaurantId: null, restaurantName: null, deliveryFee: 0, couponCode: null };
        }),

      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.id !== itemId)
              : state.items.map((item) =>
                  item.id === itemId ? { ...item, quantity: Math.min(20, quantity) } : item,
                ),
        })),

      applyCoupon: (code) => {
        const normalised = code.trim().toUpperCase();
        if (!COUPONS[normalised]) return false;
        set({ couponCode: normalised });
        return true;
      },

      setCoupon: (code) =>
        set({ couponCode: code ? code.trim().toUpperCase() : null }),

      removeCoupon: () => set({ couponCode: null }),

      clear: () =>
        set({
          restaurantId: null,
          restaurantName: null,
          deliveryFee: 0,
          items: [],
          couponCode: null,
        }),
    }),
    {
      name: 'savora.cart.v1',
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        restaurantName: state.restaurantName,
        deliveryFee: state.deliveryFee,
        items: state.items,
        couponCode: state.couponCode,
      }),
    },
  ),
);

export const selectCartCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCartSubtotal = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

export function calculateCartTotals(
  state: Pick<CartState, 'items' | 'deliveryFee' | 'couponCode'>,
): { subtotal: number; deliveryFee: number; serviceFee: number; discount: number; total: number } {
  const subtotal = state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const serviceFee = subtotal > 0 ? 2.5 : 0;

  const evaluation = state.couponCode
    ? evaluatePreviewCoupon(state.couponCode, subtotal, state.deliveryFee)
    : null;

  const coupon = state.couponCode ? COUPONS[state.couponCode] : undefined;
  const discount = evaluation?.valid ? evaluation.discount : 0;
  let deliveryFee = state.deliveryFee;
  if (coupon?.kind === 'free_delivery') {
    deliveryFee = 0;
  }

  return {
    subtotal,
    deliveryFee,
    serviceFee,
    discount: Math.round(discount * 100) / 100,
    total: Math.round((subtotal + deliveryFee + serviceFee - discount) * 100) / 100,
  };
}
