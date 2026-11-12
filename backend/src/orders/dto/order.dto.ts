import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderAction, OrderStatus } from '../../common/enums/order.enum';

export class OrderAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  label?: string;

  @IsString()
  @Length(1, 160)
  line1: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  line2?: string;

  @IsString()
  @Length(1, 80)
  city: string;

  @IsString()
  @Length(1, 80)
  state: string;

  @IsString()
  @Length(1, 20)
  postalCode: string;

  @IsString()
  @Length(1, 80)
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  instructions?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lng?: number;
}

export class CreateOrderSelectedOptionDto {
  @IsMongoId()
  groupId: string;

  @IsMongoId()
  optionId: string;
}

export class CreateOrderItemDto {
  @IsMongoId()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderSelectedOptionDto)
  selectedOptions?: CreateOrderSelectedOptionDto[];

  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;
}

export class CreateOrderDto {
  @IsString()
  @Length(8, 120)
  idempotencyKey: string;

  @IsMongoId()
  restaurantId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ValidateNested()
  @Type(() => OrderAddressDto)
  deliveryAddress: OrderAddressDto;

  @IsString()
  @Length(1, 64)
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  couponCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class OrderQueryDto {
  @IsOptional()
  @IsMongoId()
  restaurantId?: string;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

export class OrderTransitionDto {
  @IsEnum(OrderAction)
  action: OrderAction;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
