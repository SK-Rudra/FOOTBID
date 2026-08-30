import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  AUCTION_DEFAULT_DURATION_SECONDS,
  AUCTION_MAX_DURATION_SECONDS,
  AUCTION_MIN_DURATION_SECONDS,
} from '../auction.constants.js';

export class StartAuctionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(AUCTION_MIN_DURATION_SECONDS)
  @Max(AUCTION_MAX_DURATION_SECONDS)
  durationSeconds = AUCTION_DEFAULT_DURATION_SECONDS;
}
