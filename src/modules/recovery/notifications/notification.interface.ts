export interface GuardianAlertData {
  guardianAddress: string;
  proposalId: string;
  walletAddress: string;
  newSigner: string;
  timelockExpiresAt: Date;
}

export interface INotificationProvider {
  sendGuardianAlert(data: GuardianAlertData): Promise<void>;
}
