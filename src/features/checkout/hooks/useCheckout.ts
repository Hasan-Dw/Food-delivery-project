import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { services } from '@/services';
import type { Order } from '@/types';
import { useCartStore } from '@/stores/cart-store';
import type { CheckoutOrderInput } from '../checkout-service-contract';

type CheckoutInput = Omit<CheckoutOrderInput, 'idempotencyKey'>;

function getIdempotencyKey(): string {
  const storageKey = 'savora.checkout.requestId';
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const created = crypto.randomUUID();
  sessionStorage.setItem(storageKey, created);
  return created;
}

export function useCheckout() {
  const queryClient = useQueryClient();
  const [idempotencyKey] = useState(getIdempotencyKey);
  const [partialOrder, setPartialOrder] = useState<Order | null>(null);
  const partialOrderRef = useRef<Order | null>(null);

  const mutation = useMutation({
    mutationFn: async (input: CheckoutInput) => {
      // The order endpoint is idempotent on `idempotencyKey`. If the order was
      // created but delivery setup failed, the retry reuses it instead of
      // placing a second order.
      const order =
        partialOrderRef.current ??
        (await services.orders.create({ ...input, idempotencyKey }));
      if (!partialOrderRef.current) {
        partialOrderRef.current = order;
        setPartialOrder(order);
      }

      // The backend already creates the delivery with the order; this call is
      // idempotent there and creates it explicitly in preview mode.
      const delivery = await services.deliveries.createForOrder({
        idempotencyKey,
        orderId: order.id,
      });
      return { ...order, deliveryId: order.deliveryId ?? delivery.id };
    },
    onSuccess: (order) => {
      useCartStore.getState().clear();
      sessionStorage.removeItem('savora.checkout.requestId');
      partialOrderRef.current = null;
      setPartialOrder(null);
      queryClient.setQueryData(queryKeys.order(order.id), order);
      queryClient.setQueryData(queryKeys.deliveryForOrder(order.id), {
        id: order.deliveryId,
        orderId: order.id,
        restaurantId: order.restaurantId,
        customerId: order.customerId,
        driverId: null,
        status: 'PENDING_ASSIGNMENT',
        driverLocation: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orderList() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.restaurantOrders(order.restaurantId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveries }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activeOrder }),
      ]);
    },
  });

  return { mutation, partialOrder, isSubmissionReady: true };
}
