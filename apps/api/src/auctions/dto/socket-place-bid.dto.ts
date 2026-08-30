import { IsString, MaxLength, MinLength } from 'class-validator';
import { PlaceBidDto } from './place-bid.dto.js';

export class SocketPlaceBidDto extends PlaceBidDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  auctionId!: string;
}
