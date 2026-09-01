import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ContentTier } from '../../generated/prisma/enums.js';

export enum FormationSortField {
  NAME = 'name',
  MARKET_VALUE = 'marketValue',
  WIDTH = 'width',
  TEMPO = 'tempo',
  PRESSING_INTENSITY = 'pressingIntensity',
  ATTACKING_BONUS = 'attackingBonus',
  MIDFIELD_BONUS = 'midfieldBonus',
  DEFENDING_BONUS = 'defendingBonus',
  CHEMISTRY_BONUS = 'chemistryBonus',
}

export enum FormationSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryFormationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  buildUpStyle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  attackingStyle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  defensiveStyle?: string;

  @IsOptional()
  @IsEnum(ContentTier)
  tier?: ContentTier;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150_000_000)
  minMarketValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150_000_000)
  maxMarketValue?: number;

  @IsOptional()
  @IsEnum(FormationSortField)
  sortBy: FormationSortField = FormationSortField.NAME;

  @IsOptional()
  @IsEnum(FormationSortDirection)
  sortOrder: FormationSortDirection = FormationSortDirection.ASC;

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
