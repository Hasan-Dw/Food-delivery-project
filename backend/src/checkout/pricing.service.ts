import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItem, type MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import {
  Restaurant,
  type RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import { RestaurantStatus } from '../common/enums/user.enum';
import { fromCents, toCents } from '../common/utils/money.util';
import { PromotionsService } from '../promotions/promotions.service';
import type {
  EvaluatePromotionInput,
  PromotionEvaluation,
  PromotionPreview,
} from '../promotions/interfaces/promotion-response.interface';
import type { QuoteItemDto } from './dto/checkout-quote.dto';
import type {
  CheckoutQuoteResponse,
  QuoteLineItem,
} from './interfaces/checkout-quote.interface';

export const SERVICE_FEE_CENTS = 250;
export const TAX_RATE = 0;

export interface PriceCartInput {
  customerId: string;
  restaurantId: string;
  items: QuoteItemDto[];
  couponCode?: string;
  /**
   * Order creation fails the whole request when a coupon is invalid. A quote
   * returns the message inline so the checkout UI can keep showing totals.
   */
  strictPromotion?: boolean;
}

export interface PricedCart {
  restaurant: RestaurantDocument;
  items: QuoteLineItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  promotion: PromotionEvaluation | null;
  promotionPreview?: PromotionPreview;
}

function subId(value: unknown): string {
  return String((value as { _id: Types.ObjectId })._id);
}

function centPrice(menuItem: MenuItemDocument, optionIds: string[]): number {
  let unitPriceCents = menuItem.priceCents;

  for (const group of menuItem.optionGroups ?? []) {
    for (const option of group.options ?? []) {
      if (optionIds.includes(subId(option))) {
        unitPriceCents += option.priceDeltaCents;
      }
    }
  }

  return unitPriceCents;
}

@Injectable()
export class PricingService {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>,
    private readonly promotionsService: PromotionsService,
  ) {}

  async priceCart(input: PriceCartInput): Promise<PricedCart> {
    if (!Types.ObjectId.isValid(input.restaurantId)) {
      throw new BadRequestException({
        code: 'restaurant_unavailable',
        message: 'That restaurant is not available.',
      });
    }
    if (!input.items?.length) {
      throw new BadRequestException({
        code: 'cart_empty',
        message: 'Add at least one item before checking out.',
      });
    }

    const restaurant = await this.restaurantModel.findById(input.restaurantId).exec();
    if (!restaurant || restaurant.status !== RestaurantStatus.APPROVED) {
      throw new NotFoundException({
        code: 'restaurant_unavailable',
        message: 'That restaurant is not available.',
      });
    }

    if (!restaurant.isOpen) {
      throw new BadRequestException({
        code: 'restaurant_closed',
        message: 'This restaurant is not accepting orders right now.',
      });
    }

    const productIds = input.items.map((item) => item.productId);
    const menuItems = await this.menuItemModel
      .find({ _id: { $in: productIds }, restaurantId: restaurant._id })
      .exec();
    const byId = new Map(menuItems.map((item) => [item._id.toString(), item]));

    const lines: QuoteLineItem[] = [];
    let subtotalCents = 0;

    for (const requested of input.items) {
      if (!Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > 20) {
        throw new BadRequestException({
          code: 'invalid_quantity',
          message: 'Each item quantity must be between 1 and 20.',
        });
      }

      const menuItem = byId.get(requested.productId);
      if (!menuItem) {
        throw new BadRequestException({
          code: 'menu_item_unavailable',
          message: 'One of the items is no longer on this restaurant’s menu.',
        });
      }
      if (!menuItem.available) {
        throw new BadRequestException({
          code: 'menu_item_unavailable',
          message: `${menuItem.name} is currently unavailable.`,
        });
      }

      const selections = requested.selectedOptions ?? [];
      const selectionByGroup = new Map<string, string[]>();

      for (const selection of selections) {
        const group = (menuItem.optionGroups ?? []).find(
          (entry) => subId(entry) === selection.groupId,
        );
        if (!group) {
          throw new BadRequestException({
            code: 'menu_option_unavailable',
            message: `An option for ${menuItem.name} is no longer available.`,
          });
        }
        const option = (group.options ?? []).find(
          (entry) => subId(entry) === selection.optionId,
        );
        if (!option) {
          throw new BadRequestException({
            code: 'menu_option_unavailable',
            message: `An option for ${menuItem.name} is no longer available.`,
          });
        }

        const current = selectionByGroup.get(selection.groupId) ?? [];
        if (current.includes(selection.optionId)) continue;
        current.push(selection.optionId);
        selectionByGroup.set(selection.groupId, current);
      }

      for (const group of menuItem.optionGroups ?? []) {
        const selected = selectionByGroup.get(subId(group)) ?? [];
        const minimum = group.required ? Math.max(1, group.minSelections) : group.minSelections;
        if (selected.length < minimum) {
          throw new BadRequestException({
            code: 'menu_option_required',
            message: `Choose ${minimum} option${minimum === 1 ? '' : 's'} for ${menuItem.name}.`,
          });
        }
        if (selected.length > group.maxSelections) {
          throw new BadRequestException({
            code: 'menu_option_limit',
            message: `Too many options selected for ${menuItem.name}.`,
          });
        }
      }

      const optionIds = selections.map((selection) => selection.optionId);
      const unitPriceCents = centPrice(menuItem, optionIds);
      const selectedOptions = selections.map((selection) => {
        const group = (menuItem.optionGroups ?? []).find(
          (entry) => subId(entry) === selection.groupId,
        );
        const option = (group?.options ?? []).find(
          (entry) => subId(entry) === selection.optionId,
        );
        return {
          groupId: selection.groupId,
          groupName: group?.name ?? '',
          optionId: selection.optionId,
          optionName: option?.name ?? '',
          priceDelta: fromCents(option?.priceDeltaCents ?? 0),
        };
      });

      subtotalCents += unitPriceCents * requested.quantity;
      lines.push({
        productId: menuItem._id.toString(),
        name: menuItem.name,
        imageKey: menuItem.imageKey,
        quantity: requested.quantity,
        unitPrice: fromCents(unitPriceCents),
        selectedOptions,
        ...(requested.notes?.trim() ? { notes: requested.notes.trim() } : {}),
      });
    }

    if (restaurant.minOrder > 0 && subtotalCents < toCents(restaurant.minOrder)) {
      throw new BadRequestException({
        code: 'minimum_order_not_met',
        message: `This restaurant has a minimum order of $${restaurant.minOrder.toFixed(2)}.`,
      });
    }

    const deliveryFeeCents = Math.max(0, toCents(restaurant.deliveryFee ?? 0));
    const serviceFeeCents = SERVICE_FEE_CENTS;

    let promotion: PromotionEvaluation | null = null;
    let promotionPreview: PromotionPreview | undefined;
    let discountCents = 0;
    const couponCode = input.couponCode?.trim().toUpperCase();

    if (couponCode) {
      const evaluateInput: EvaluatePromotionInput = {
        code: couponCode,
        customerId: input.customerId,
        restaurantId: input.restaurantId,
        subtotalCents,
      };

      if (input.strictPromotion) {
        promotion = await this.promotionsService.evaluate(evaluateInput);
        discountCents = promotion.discountCents;
        promotionPreview = {
          valid: true,
          code: promotion.code,
          title: promotion.title,
          description: promotion.description,
          discount: fromCents(promotion.discountCents),
        };
      } else {
        promotionPreview = await this.promotionsService.preview(evaluateInput);
        if (promotionPreview.valid) {
          promotion = await this.promotionsService.evaluate(evaluateInput);
          discountCents = promotion.discountCents;
        }
      }
    }

    const taxCents = Math.round((subtotalCents * TAX_RATE) / 100);
    const totalCents = Math.max(
      0,
      subtotalCents + deliveryFeeCents + serviceFeeCents - discountCents + taxCents,
    );

    return {
      restaurant,
      items: lines,
      subtotalCents,
      deliveryFeeCents,
      serviceFeeCents,
      discountCents,
      taxCents,
      totalCents,
      promotion,
      ...(promotionPreview ? { promotionPreview } : {}),
    };
  }

  toQuoteResponse(priced: PricedCart, couponCode?: string): CheckoutQuoteResponse {
    return {
      restaurantId: priced.restaurant._id.toString(),
      restaurantName: priced.restaurant.name,
      restaurantImageKey: priced.restaurant.imageKey,
      items: priced.items,
      subtotal: fromCents(priced.subtotalCents),
      deliveryFee: fromCents(priced.deliveryFeeCents),
      serviceFee: fromCents(priced.serviceFeeCents),
      discount: fromCents(priced.discountCents),
      tax: fromCents(priced.taxCents),
      total: fromCents(priced.totalCents),
      minOrder: priced.restaurant.minOrder,
      currency: 'USD',
      ...(couponCode?.trim() ? { couponCode: couponCode.trim().toUpperCase() } : {}),
      ...(priced.promotionPreview ? { promotion: priced.promotionPreview } : {}),
    };
  }
}
