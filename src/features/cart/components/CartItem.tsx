import type { CartItem as CartItemType } from "@/types";
import { imageUrl, imageAlt } from "@/config/images";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  return (
    <div className="flex gap-4 rounded-xl border p-4">
      {/* Product Image */}
      <img
        src={imageUrl(item.imageKey)}
        alt={imageAlt(item.imageKey,item.name) }
        className="h-24 w-24 rounded-lg object-cover"
      />

      {/* Product Details */}
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="font-semibold">
          {item.name}
        </h3>

        <p className="text-sm text-gray-500">
          ${item.unitPrice.toFixed(2)}
        </p>

        {/* Selected Options */}
        {item.selectedOptions.length > 0 && (
          <div className="text-sm text-gray-500">
            {item.selectedOptions.map((option) => (
              <p key={`${option.groupId}-${option.optionId}`}>
                {option.groupName}: {option.optionName}
              </p>
            ))}
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <p className="text-sm text-gray-500">
            Notes: {item.notes}
          </p>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              onUpdateQuantity(item.id, item.quantity - 1)
            }
            className="rounded border px-3 py-1"
          >
            -
          </button>

          <span>{item.quantity}</span>

          <button
            onClick={() =>
              onUpdateQuantity(item.id, item.quantity + 1)
            }
            disabled={item.quantity >= 20}
            className="rounded border px-3 py-1 disabled:opacity-50"
          >
            +
          </button>

          <button
            onClick={() => onRemove(item.id)}
            className="ml-auto text-red-500"
          >
            Remove
          </button>
        </div>

        {/* Item Total */}
        <p className="font-semibold">
          ${(item.unitPrice * item.quantity).toFixed(2)}
        </p>
      </div>
    </div>
  );
}

export default CartItem;