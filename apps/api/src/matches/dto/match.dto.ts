import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class JoinMatchDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(8, 12)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Room code may contain only uppercase letters and numbers.',
  })
  roomCode!: string;
}

export class MatchParamsDto {
  @IsString()
  @Length(1, 64)
  matchId!: string;
}
