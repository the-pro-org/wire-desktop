/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

const pkg = require('./../package.json');

export class Config {

  public static readonly WIRE = 'https://wire.com';

  public static readonly WIRE_SUPPORT = 'https://support.wire.com';
  public static readonly WIRE_LEGAL = 'https://wire.com/legal/';
  public static readonly WIRE_PRIVACY = 'https://wire.com/privacy/';
  public static readonly WIRE_LICENSES = 'https://wire.com/legal/licenses/';

  public static readonly DEV_URL = 'https://wire-webapp-dev.zinfra.io/';
  public static readonly EDGE_URL = 'https://wire-webapp-edge.zinfra.io/';
  public static readonly INTERNAL_URL = 'https://wire-webapp-staging.wire.com/?env=prod';
  public static readonly LOCALHOST_URL = 'http://localhost:8888/';
  public static readonly PROD_URL = 'https://app.wire.com/';
  public static readonly STAGING_URL = 'https://wire-webapp-staging.zinfra.io/';

  public static readonly DEV = 'dev';
  public static readonly EDGE = 'edge';
  public static readonly INTERNAL = 'internal';
  public static readonly LOCALHOST = 'localhost';
  public static readonly PROD = 'prod';
  public static readonly STAGING = 'staging';

  public static readonly MIN_WIDTH_MAIN = 760;
  public static readonly MIN_HEIGHT_MAIN = 512;

  public static readonly DEFAULT_WIDTH_MAIN = 1024;
  public static readonly DEFAULT_HEIGHT_MAIN = 768;

  public static readonly WIDTH_AUTH = 400;
  public static readonly HEIGHT_AUTH = 576;

  public static readonly UPDATE_DELAY = 300000; // 5 * 60 * 1000
  public static readonly UPDATE_INTERVAL = 86400000; // 24 * 60 * 60 * 1000

  public static readonly EMBED_DOMAINS: Array<{
    name: string,
    hostname: Array<string>,
    allowedExternalLinks: Array<string>
  }> = [
    {
      name: 'YouTube',
      hostname: ['www.youtube-nocookie.com'],
      allowedExternalLinks: [
        'www.youtube.com',
      ],
    },
    {
      name: 'Vimeo',
      hostname: ['player.vimeo.com'],
      allowedExternalLinks: [
        'vimeo.com',
        'player.vimeo.com',
      ],
    },
    {
      name: 'SoundCloud',
      hostname: ['w.soundcloud.com'],
      allowedExternalLinks: [
        'soundcloud.com',
      ],
    },
    {
      name: 'Spotify',
      hostname: ['open.spotify.com', 'embed.spotify.com'],
      allowedExternalLinks: [
        'www.spotify.com',
        'developer.spotify.com',
      ],
    },
  ];

  public static readonly LOCALE: Array<string> = [
    'en',
    'cs',
    'da',
    'de',
    'el',
    'es',
    'fi',
    'fr',
    'hr',
    'hu',
    'it',
    'lt',
    'nl',
    'pl',
    'pt',
    'ro',
    'ru',
    'sk',
    'sl',
    'tr',
    'uk',
  ];

  public static readonly RAYGUN_API_KEY = '';

  public static readonly GOOGLE_SCOPES = 'https://www.googleapis.com/auth/contacts.readonly';
  public static readonly GOOGLE_CLIENT_ID = '';
  public static readonly GOOGLE_CLIENT_SECRET = '';

  public static readonly CONSOLE_LOG = 'console.log';

  public static readonly SPELL_SUGGESTIONS = 4;
  public static readonly SPELL_SUPPORTED: Array<string> = [
    'en',
  ];

  private static readonly ENVIRONMENT: string = pkg.environment;
  public static readonly PRODUCTION: boolean = Config.ENVIRONMENT === 'production';
  public static readonly DEVELOPMENT: boolean = !Config.PRODUCTION;
  public static readonly UPDATE_WIN_URL: string = pkg.updateWinUrl;
  public static readonly VERSION: string = pkg.version;
  public static readonly NAME: string = pkg.productName;
};
