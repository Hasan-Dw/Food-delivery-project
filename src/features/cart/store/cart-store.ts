import { create } from "zustand";
import { persist } from "zustand/middleware";
import { validateProductOptions } from "../validate-product-options";

import type {
  CartItem,
  Product,
  SelectedOption,
} from "@/types";

// البيانات المطلوبة لإضافة منتج إلى السلة
interface AddProductInput {
  product: Product;
  restaurantName: string;
  deliveryFee?:number;
  quantity?: number;
  selectedOptions?: SelectedOption[];
  notes?: string;
}

// نتيجة محاولة إضافة منتج
type AddProductResult =
  | "added"
  | "requires-restaurant-switch"
  | "product-unavailable"
  | "invalid-options";
// شكل الحالة والدوال التي يوفرها الـ Store
interface CartState {
  restaurantId: string | null;
  restaurantName: string | null;
  deliveryFee?:number;
  items: CartItem[];

  addProduct: (
    input: AddProductInput
  ) => AddProductResult;

  confirmRestaurantSwitch: (
    input: AddProductInput
  ) => "added" | "product-unavailable" | "invalid-options";

  removeItem: (itemId: string) => void;

  updateQuantity: (
    itemId: string,
    quantity: number
  ) => void;

  updateNotes: (
    itemId: string,
    notes: string
  ) => void;

  clearCart: () => void;
}
// حساب سعر المنتج مع أسعار الإضافات
function calculateUnitPrice(
    product: Product,
    selectedOptions: SelectedOption[]
  ): number {
    const optionsPrice = selectedOptions.reduce(
      (total, selected) => {
        const group = product.optionGroups.find(
          (group) => group.id === selected.groupId
        );
  
        const option = group?.options.find(
          (option) => option.id === selected.optionId
        );
  
        return total + (option?.priceDelta ?? 0);
      },
      0
    );
  
    return Math.round(
      (product.price + optionsPrice) * 100
    ) / 100;
  }


  function getProductSignature(
    productId: string,
    selectedOptions: SelectedOption[],
    notes?: string
  ): string {
    const optionsIds = selectedOptions
      .map((option) => `${option.groupId}:${option.optionId}`)
      .sort();
  
    return [productId, ...optionsIds, notes?.trim() ?? ""].join("|");
  }
  // إنشاء عنصر جديد للسلة
function createCartItem({
    product,
    quantity = 1,
    selectedOptions = [],
    notes,
  }: AddProductInput): CartItem {
    return {
      id: crypto.randomUUID(),
      productId: product.id,
      restaurantId: product.restaurantId,
      name: product.name,
      imageKey: product.imageKey,
      unitPrice: calculateUnitPrice(product, selectedOptions),
      quantity: Number.isFinite(quantity)
      ? Math.min(20, Math.max(1, Math.floor(quantity)))
      : 1,      selectedOptions: selectedOptions.map((selected) => {
        const group = product.optionGroups.find(
          (group) => group.id === selected.groupId
        )!;
      
        const option = group.options.find(
          (option) => option.id === selected.optionId
        )!;
      
        return {
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta,
        };
      }),      notes,
    };
  }
  
  // Zustand Store
  export const useCartStore = create<CartState>()(
    persist(
      (set, get) => ({
        restaurantId: null,
        restaurantName: null,
        deliveryFee: 0,
        items: [],
  
        // إضافة منتج
        addProduct: (input) => {
          const current = get();
          const { product } = input;
// التأكد من توفر المنتج
if (!product.available) {
    return "product-unavailable";
  }
  
  // التأكد من صحة الخيارات
  if (
    !validateProductOptions(
      product,
      input.selectedOptions ?? []
    )
  ) {
    return "invalid-options";
  }
          // التأكد من أن المنتج من نفس المطعم
          if (
            current.restaurantId !== null &&
            current.restaurantId !== product.restaurantId
          ) {
            return "requires-restaurant-switch";
          }
  
          const newItem = createCartItem(input);
  
          const newSignature = getProductSignature(
            product.id,
            input.selectedOptions ?? [],
            input.notes
          );
  
          // هل المنتج موجود مسبقاً بنفس الخيارات والملاحظات؟
          const existingItem = current.items.find(
            (item) =>
              getProductSignature(
                item.productId,
                item.selectedOptions,
                item.notes
              ) === newSignature
          );
  
          let updatedItems: CartItem[];
  
          if (existingItem) {
            updatedItems = current.items.map((item) =>
              item.id === existingItem.id
                ? {
                    ...item,
                    quantity: Math.min(
                      20,
                      item.quantity + newItem.quantity
                    ),
                  }
                : item
            );
          } else {
            updatedItems = [...current.items, newItem];
          }
  
          set({
            items: updatedItems,
            restaurantId: product.restaurantId,
            restaurantName: input.restaurantName,
            deliveryFee: input.deliveryFee ?? 0,
          });
  
          return "added";
        },
  
        // تأكيد تبديل المطعم
        confirmRestaurantSwitch: (input) => {
            const { product } = input;
          
            if (!product.available) {
              return "product-unavailable";
            }
          
            if (
              !validateProductOptions(
                product,
                input.selectedOptions ?? []
              )
            ) {
              return "invalid-options";
            }
          
            const newItem = createCartItem(input);
          
            set({
              restaurantId: product.restaurantId,
              restaurantName: input.restaurantName,
              deliveryFee: input.deliveryFee ?? 0,
              items: [newItem],
            });
          
            return "added";
          },
  
        // حذف منتج
        removeItem: (itemId) => {
          set((state) => {
            const items = state.items.filter(
              (item) => item.id !== itemId
            );
  
            if (items.length === 0) {
              return {
                items: [],
                restaurantId: null,
                restaurantName: null,
                deliveryFee: 0,
              };
            }
  
            return { items };
          });
        },
  
        // تعديل الكمية
        updateQuantity: (itemId, quantity) => {
          if (!Number.isInteger(quantity)) return;
  
          set((state) => {
            if (quantity <= 0) {
              const items = state.items.filter(
                (item) => item.id !== itemId
              );
  
              return items.length === 0
                ? {
                    items: [],
                    restaurantId: null,
                    restaurantName: null,
                    deliveryFee: 0,
                  }
                : { items };
            }
  
            return {
              items: state.items.map((item) =>
                item.id === itemId
                  ? { ...item, quantity: Math.min(20, quantity) }
                  : item
              ),
            };
          });
        },
  
        // تعديل الملاحظات
        updateNotes: (itemId, notes) => {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === itemId
                ? { ...item, notes }
                : item
            ),
          }));
        },
        // تفريغ السلة
      clearCart: () => {
        set({
          restaurantId: null,
          restaurantName: null,
          deliveryFee: 0,
          items: [],
        });
      },
    }),

    {
        name: "savora.cart.v2",
        partialize: (state) => ({
          restaurantId: state.restaurantId,
          restaurantName: state.restaurantName,
          deliveryFee: state.deliveryFee,
          items: state.items,
        }),
      }

  )
);