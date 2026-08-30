import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedIdentity } from '../auth/auth.types.js';
import {
  BudgetHistoryQueryDto,
  WalletQueryDto,
} from './dto/wallet-query.dto.js';
import { BudgetsService } from './budgets.service.js';

@Controller('wallet')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  getWallet(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Query() query: WalletQueryDto,
  ) {
    return this.budgetsService.getWalletForUser(identity.userId, query.matchId);
  }

  @Get('transactions')
  listTransactions(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Query() query: BudgetHistoryQueryDto,
  ) {
    return this.budgetsService.listTransactionsForUser(identity.userId, query);
  }
}
