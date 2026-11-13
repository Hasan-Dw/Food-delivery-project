import { PartialType } from '@nestjs/swagger';
import { CreatePromotionDto } from './create-promotion.dto';

/**
 * Promotion updates keep the same field validation but every field is optional.
 * The promotion code remains unique and the redemption ledger is never edited.
 */
export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
