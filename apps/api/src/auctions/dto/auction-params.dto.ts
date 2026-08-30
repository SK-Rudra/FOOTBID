import { IsString, MaxLength, MinLength } from 'class-validator';

export class MatchAuctionParamsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  matchId!: string;
}

export class AuctionParamsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  auctionId!: string;
}
