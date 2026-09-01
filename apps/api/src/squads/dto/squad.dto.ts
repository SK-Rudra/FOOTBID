import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SquadRole } from '../../generated/prisma/enums.js';

export class SquadPlayerAssignmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  playerId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  slot!: number;

  @IsEnum(SquadRole)
  role!: SquadRole;

  @IsBoolean()
  isCaptain!: boolean;
}

export class SaveSquadDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  formationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  managerId!: string;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SquadPlayerAssignmentDto)
  players!: SquadPlayerAssignmentDto[];
}

export class LockSquadDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version!: number;
}
