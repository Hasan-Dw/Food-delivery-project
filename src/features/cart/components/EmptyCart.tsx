
interface EmptyCartProps {
  onBrowseRestaurants: () => void;
}

function EmptyCart({ onBrowseRestaurants }: EmptyCartProps) {
  return (
    <div className="relative isolate flex w-full flex-col items-center justify-center overflow-hidden px-4 py-6 text-center sm:py-8">

      {/* Decorative Background */}
      <div className="pointer-events-none absolute -right-16 -top-16 -z-10 h-48 w-48 rounded-full bg-gold-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 -z-10 h-48 w-48 rounded-full bg-terracotta-50 blur-3xl" />

      {/* Cart Illustration */}
      <div className="relative mb-5 flex h-32 w-32 items-center justify-center rounded-full bg-ivory-100 sm:h-36 sm:w-36">

        <div className="absolute inset-3 rounded-full border border-gold-200/70" />

        <svg
          viewBox="0 0 180 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative h-24 w-24 sm:h-28 sm:w-28"
          aria-hidden="true"
        >
          <path
            d="M32 42H43L57 112C58 118 63 122 69 122H130"
            stroke="#354638"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M49 54H151L137 102H60L49 54Z"
            fill="#DDE3D9"
            stroke="#354638"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          <path
            d="M60 70H146M65 87H141"
            stroke="#87917B"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <path
            d="M91 56L95 101M120 56L116 101"
            stroke="#87917B"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          <circle cx="73" cy="139" r="9" fill="#C65D3B" />
          <circle cx="127" cy="139" r="9" fill="#C65D3B" />

          <circle cx="73" cy="139" r="3" fill="#FBF8F1" />
          <circle cx="127" cy="139" r="3" fill="#FBF8F1" />

          <path
            d="M143 25L147 34L156 38L147 42L143 51L139 42L130 38L139 34L143 25Z"
            fill="#D6AA70"
          />

          <circle cx="30" cy="94" r="4" fill="#D6AA70" />
        </svg>

        {/* Empty Indicator */}
        <div className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-cream bg-terracotta text-cream shadow-soft">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M7 7L17 17M17 7L7 17"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Text Content */}
      <span className="eyebrow mb-3 text-terracotta">
        YOUR NEXT MEAL AWAITS
      </span>

      <h2 className="mb-2 font-display text-2xl font-normal text-olive-900 sm:text-3xl">
        Your cart is empty
      </h2>

      <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-brown-500">
        Looks like you haven't added anything to your cart yet.
        Explore our restaurants and discover something delicious!
      </p>

      {/* Browse Button */}
      <button
        onClick={onBrowseRestaurants}
        className="group inline-flex items-center justify-center gap-3 rounded-full bg-terracotta px-7 py-3 text-sm font-semibold text-cream shadow-soft transition-all duration-300 hover:-translate-y-1 hover:bg-terracotta-600 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
      >
        Browse Restaurants

        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        >
          <path
            d="M5 12H19M13 6L19 12L13 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Bottom Decoration */}
      <div className="mt-6 flex items-center gap-3 text-[10px] tracking-[0.18em] text-olive-400">
        <span className="h-px w-7 bg-olive-200" />
        MADE FOR GOOD TASTE
        <span className="h-px w-7 bg-olive-200" />
      </div>

    </div>
  );
}

export default EmptyCart;
