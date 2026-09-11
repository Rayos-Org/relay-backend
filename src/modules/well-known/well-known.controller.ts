import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('.well-known')
export class WellKnownController {
  constructor(private configService: ConfigService) {}

  @Get('apple-app-site-association')
  @Header('Content-Type', 'application/json')
  getAASA() {
    // In a real scenario, the app ID and team ID would be environment variables.
    // For this milestone, we use the ones expected by the architecture.
    return {
      webcredentials: {
        apps: ['TEAMID.dev.rayos.wallet'],
      },
      applinks: {
        details: [
          {
            appIDs: ['TEAMID.dev.rayos.wallet'],
            components: [{ '/': '/recovery/*', comment: 'Guardian approval deep links' }],
          },
        ],
      },
    };
  }

  @Get('assetlinks.json')
  @Header('Content-Type', 'application/json')
  getAssetLinks() {
    return [
      {
        relation: [
          'delegate_permission/common.handle_all_urls',
          'delegate_permission/common.get_login_creds',
        ],
        target: {
          namespace: 'android_app',
          package_name: 'dev.rayos.wallet',
          sha256_cert_fingerprints: [
            // Placeholder: Should be replaced with actual fingerprint of EAS build
            '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00',
          ],
        },
      },
    ];
  }
}
