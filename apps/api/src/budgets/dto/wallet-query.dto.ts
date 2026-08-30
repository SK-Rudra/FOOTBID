import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BudgetTransactionType } from '../../generated/prisma/enums.js';

export class WalletQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  matchId?: string;
}

export class BudgetHistoryQueryDto extends WalletQueryDto {
  @IsOptional()
  @IsEnum(BudgetTransactionType)
  type?: BudgetTransactionType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
