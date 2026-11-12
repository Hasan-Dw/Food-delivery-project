import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMenuItemDto } from './create-menu-item.dto';

/**
 * A menu item cannot be moved to another restaurant through an update. The
 * restaurant link is established at creation and remains authoritative.
 */
export class UpdateMenuItemDto extends PartialType(
  OmitType(CreateMenuItemDto, ['restaurantId'] as const),
) {}
