import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CheckoutQuoteDto } from './dto/checkout-quote.dto';
import type { CheckoutQuoteResponse } from './interfaces/checkout-quote.interface';
import { PricingService } from './pricing.service';

@ApiTags('Checkout')
@ApiBearerAuth()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly pricingService: PricingService) {}

  /**
   * Server-authoritative cart pricing. The browser's cart is only a draft; all
   * prices, fees, availability and discounts are recalculated here.
   */
  @Roles(UserRole.CUSTOMER)
  @Post('quote')
  async quote(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutQuoteDto,
  ): Promise<CheckoutQuoteResponse> {
    const priced = await this.pricingService.priceCart({
      customerId: user.id,
      restaurantId: dto.restaurantId,
      items: dto.items,
      couponCode: dto.couponCode,
    });
    return this.pricingService.toQuoteResponse(priced, dto.couponCode);
  }
}
