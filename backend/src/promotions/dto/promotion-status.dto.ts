import { IsBoolean } from 'class-validator';

export class PromotionStatusDto {
  @IsBoolean()
  active: boolean;
}
