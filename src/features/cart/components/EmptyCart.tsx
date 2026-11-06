interface EmptyCartProps {
    onBrowseRestaurants: () => void;
  }
  
  function EmptyCart({
    onBrowseRestaurants,
  }: EmptyCartProps) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border p-10 text-center">
        <div className="mb-4 text-6xl">
          🛒
        </div>
  
        <h2 className="mb-2 text-2xl font-bold">
          Your cart is empty
        </h2>
  
        <p className="mb-6 text-gray-500">
          Looks like you haven't added anything to your cart yet.
          Explore our restaurants and find something delicious!
        </p>
  
        <button
          onClick={onBrowseRestaurants}
          className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
        >
          Browse Restaurants
        </button>
      </div>
    );
  }
  
  export default EmptyCart;