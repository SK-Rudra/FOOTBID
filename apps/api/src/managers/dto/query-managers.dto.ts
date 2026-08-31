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

export enum ManagerSortField {
  OVERALL = 'overall',
  MARKET_VALUE = 'marketValue',
  FULL_NAME = 'fullName',
  ATTACKING = 'attacking',
  DEFENDING = 'defending',
  ADAPTABILITY = 'adaptability',
  MAN_MANAGEMENT = 'manManagement',
}

export enum ManagerSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryManagersDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tacticalStyle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  preferredFormation?: string;

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
  @IsEnum(ManagerSortField)
  sortBy: ManagerSortField = ManagerSortField.OVERALL;

  @IsOptional()
  @IsEnum(ManagerSortDirection)
  sortOrder: ManagerSortDirection = ManagerSortDirection.DESC;

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
