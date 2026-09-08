import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SponsorshipStrategy, SponsorshipResult } from './sponsorship.strategy';

@Injectable()
export class LaunchtubeStrategy implements SponsorshipStrategy {
  private readonly launchtubeApiKey: string;

  constructor(private configService: ConfigService) {
    this.launchtubeApiKey = this.configService.get<string>('LAUNCHTUBE_API_KEY') || '';
  }

  async sponsorAndSubmit(signedXdr: string): Promise<SponsorshipResult> {
    if (!this.launchtubeApiKey) {
      throw new HttpException('Launchtube API key not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // Assuming a hypothetical Launchtube API endpoint for demonstration
      // In a real scenario, you'd use the launchtube npm package or HTTP API
      const response = await fetch('https://api.launchtube.io/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.launchtubeApiKey}`,
        },
        body: JSON.stringify({ xdr: signedXdr }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new HttpException(
          `Launchtube submission failed: ${errorData?.message || response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();
      
      return {
        txHash: data.txHash || 'unknown_hash',
        status: data.status || 'pending',
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`Failed to communicate with Launchtube: ${error.message}`, HttpStatus.BAD_GATEWAY);
    }
  }
}
