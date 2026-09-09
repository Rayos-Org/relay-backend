import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { INotificationProvider, GuardianAlertData } from './notification.interface';

@Injectable()
export class ResendNotificationProvider implements INotificationProvider {
  private resend: Resend | null = null;
  private readonly logger = new Logger(ResendNotificationProvider.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not configured. Falling back to console logging for notifications.');
    }
  }

  async sendGuardianAlert(data: GuardianAlertData): Promise<void> {
    const subject = `Urgent: Wallet Recovery Initiated for ${data.walletAddress}`;
    const html = `
      <p>Hello Guardian,</p>
      <p>A recovery proposal has been initiated for the wallet <strong>${data.walletAddress}</strong>.</p>
      <p>The proposed new signer is: <strong>${data.newSigner}</strong>.</p>
      <p>If approved, this will take effect after <strong>${data.timelockExpiresAt.toUTCString()}</strong>.</p>
      <p>Proposal ID: <code>${data.proposalId}</code></p>
      <p>Please log in to the guardian interface to review and approve/reject this proposal.</p>
    `;

    if (this.resend) {
      try {
        // In a real app, you'd map guardianAddress to an email via the indexer or user preferences.
        // For demonstration, we assume we have a way to resolve this or we send to a default address.
        const guardianEmail = this.resolveGuardianEmail(data.guardianAddress);
        
        if (!guardianEmail) {
           this.logger.warn(`Could not resolve email for guardian ${data.guardianAddress}`);
           return;
        }

        await this.resend.emails.send({
          from: 'Rayos Relay <noreply@relay.rayos.dev>',
          to: guardianEmail,
          subject,
          html,
        });
        
        this.logger.log(`Sent guardian alert email to ${guardianEmail}`);
      } catch (error: any) {
        this.logger.error(`Failed to send email via Resend: ${error.message}`);
      }
    } else {
      // Fallback if no API key
      this.logger.log(`[SIMULATED EMAIL] To: Guardian ${data.guardianAddress} | Subject: ${subject}`);
    }
  }

  private resolveGuardianEmail(guardianAddress: string): string | null {
    // Placeholder: In a real implementation, you'd query a user-profile table 
    // to find the email associated with the guardian's wallet address.
    // For demo purposes:
    return `guardian-${guardianAddress.substring(0,6)}@example.com`;
  }
}
