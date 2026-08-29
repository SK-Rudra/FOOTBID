import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PlayerPosition } from '../../generated/prisma/enums.js';

export enum PlayerSortField {
  OVERALL = 'overall',
  MARKET_VALUE = 'marketValue',
  FULL_NAME = 'fullName',
  PACE = 'pace',
  SHOOTING = 'shooting',
  PASSING = 'passing',
  DRIBBLING = 'dribbling',
  DEFENDING = 'defending',
  PHYSICAL = 'physical',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryPlayersDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(PlayerPosition)
  position?: PlayerPosition;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  leagueId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  clubId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @Matches(/^[A-Z]{2}$/)
  nationalityCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  minOverall?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  maxOverall?: number;

  @IsOptional()
  @IsEnum(PlayerSortField)
  sortBy: PlayerSortField = PlayerSortField.OVERALL;

  @IsOptional()
  @IsEnum(SortDirection)
  sortOrder: SortDirection = SortDirection.DESC;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 12;
}
