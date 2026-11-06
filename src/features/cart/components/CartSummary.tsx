import type { CartItem } from "@/types";

interface CartSummaryProps {
  items: CartItem[];
  deliveryFee?: number;
  onCheckout: () => void;
}

function CartSummary({
  items,
  deliveryFee = 0,
  onCheckout,
}: CartSummaryProps) {
  // Calculate subtotal
  const subtotal = items.reduce(
    (total, item) =>
      total + item.unitPrice * item.quantity,
    0
  );

  // Calculate total
  const total = subtotal + deliveryFee;

  return (
    <div className="rounded-xl border p-5">
      <h2 className="mb-4 text-xl font-bold">
        Order Summary
      </h2>

      <div className="flex justify-between py-2">
        <span className="text-gray-500">Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between py-2">
        <span className="text-gray-500">Delivery Fee</span>
        <span>${deliveryFee.toFixed(2)}</span>
      </div>

      <div className="my-3 border-t" />

      <div className="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>

      <button
        onClick={onCheckout}
        disabled={items.length === 0}
        className="mt-5 w-full rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Proceed to Checkout
      </button>
    </div>
  );
}

export default CartSummary;