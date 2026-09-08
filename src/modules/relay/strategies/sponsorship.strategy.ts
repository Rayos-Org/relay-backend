export interface SponsorshipResult {
  txHash: string;
  status: string;
}

export interface SponsorshipStrategy {
  sponsorAndSubmit(signedXdr: string): Promise<SponsorshipResult>;
}
