import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { WalletLookupResponseDto } from '@common/schemas/wallet.schema';

@Controller('wallets')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Get(':credentialId')
  async lookupWallet(@Param('credentialId') credentialId: string): Promise<WalletLookupResponseDto> {
    const walletAddress = await this.indexerService.getWalletByCredential(credentialId);
    
    if (!walletAddress) {
      throw new NotFoundException(`No wallet found for credential ID: ${credentialId}`);
    }

    return {
      credentialId,
      walletAddress,
    };
  }
}
