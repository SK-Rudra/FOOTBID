import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Username may contain only lowercase letters, numbers, and underscores.',
  })
  @Length(3, 32)
  username!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 80)
  displayName!: string;

  @IsString()
  @Length(12, 128)
  @Matches(/[a-z]/, {
    message: 'Password must contain a lowercase letter.',
  })
  @Matches(/[A-Z]/, {
    message: 'Password must contain an uppercase letter.',
  })
  @Matches(/[0-9]/, {
    message: 'Password must contain a number.',
  })
  password!: string;
}
