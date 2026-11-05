import { useNavigate } from "react-router-dom";

import CartItem from "../components/CartItem";
import CartSummary from "../components/CartSummary";
import EmptyCart from "../components/EmptyCart";

import { useCartStore } from "../store/cart-store";

function CartPage() {
  const navigate = useNavigate();

  // Get cart data from Zustand
  const items = useCartStore((state) => state.items);
  const restaurantName = useCartStore(
    (state) => state.restaurantName
  );
  const deliveryFee = useCartStore(
    (state) => state.deliveryFee
  );

  // Get cart actions from Zustand
  const updateQuantity = useCartStore(
    (state) => state.updateQuantity
  );

  const removeItem = useCartStore(
    (state) => state.removeItem
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">
        My Cart
      </h1>

      <p className="mb-8 text-gray-500">
        Review your items before checkout.
      </p>

      {/* Empty Cart */}
      {items.length === 0 ? (
        <EmptyCart
          onBrowseRestaurants={() => navigate("/")}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

            {/* Cart Items */}
            <section className="flex flex-col gap-5 lg:col-span-2">
              {restaurantName && (
                <h2 className="text-xl font-semibold">
                  {restaurantName}
                </h2>
              )}

              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </section>

            {/* Cart Summary */}
            <aside>
              <CartSummary
                items={items}
                deliveryFee={deliveryFee}
                onCheckout={() => navigate("/checkout")}
              />
            </aside>

          </div>
        </>
      )}
    </main>
  );
}

export default CartPage;