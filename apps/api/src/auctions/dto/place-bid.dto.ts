import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AUCTION_MAX_PRICE,
  AUCTION_MIN_OPENING_PRICE,
} from '../auction.constants.js';

export class PlaceBidDto {
  @Type(() => Number)
  @IsInt()
  @Min(AUCTION_MIN_OPENING_PRICE)
  @Max(AUCTION_MAX_PRICE)
  amount!: number;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9:_-]+$/, {
    message:
      'idempotencyKey may only contain letters, numbers, colons, underscores, and hyphens.',
  })
  idempotencyKey!: string;
}
