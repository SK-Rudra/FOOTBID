import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AUCTION_MAX_INCREMENT,
  AUCTION_MAX_PRICE,
  AUCTION_MIN_INCREMENT,
  AUCTION_MIN_OPENING_PRICE,
} from '../auction.constants.js';

export class CreateFormationAuctionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  formationId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(AUCTION_MIN_OPENING_PRICE)
  @Max(AUCTION_MAX_PRICE)
  openingPrice!: number;

  @Type(() => Number)
  @IsInt()
  @Min(AUCTION_MIN_INCREMENT)
  @Max(AUCTION_MAX_INCREMENT)
  minimumIncrement!: number;
}
