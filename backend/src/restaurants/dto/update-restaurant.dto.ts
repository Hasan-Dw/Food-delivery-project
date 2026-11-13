import { PartialType } from '@nestjs/swagger';
import { CreateRestaurantDto } from './create-restaurant.dto';

/**
 * Owner-editable restaurant fields. Approval status, ownership, ratings,
 * review counts and platform badges are intentionally absent.
 */
export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {}
