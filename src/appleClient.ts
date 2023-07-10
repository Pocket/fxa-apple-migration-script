import fetch, { Response } from 'node-fetch';
import config from './config';
import { AppleSsoIds } from './types';
import { getAppleKey } from './clientSecret';

/**
 * **This client will not function correctly until the user transfer period has started**
 *
 * This is an external requirement to start our user migration period.
 *
 * This client generates transfer_sub shared identifiers for apple sso users.
 */
export class AppleClient {
  private access_token: string;

  private apple_key?: string;

  /**
   * Request documentation here:
   * https://developer.apple.com/documentation/sign_in_with_apple/transferring_your_apps_and_users_to_another_team#3546291
   *
   * The sample response in the docs suggests the access_token provisioned
   * by this is valid for an hour.  Restart the script to reauthenticate
   * if we need it, or just add a setTimeout(authenticate, XXX) to the end
   * of this function if it's drastically shorter.
   */
  public async authenticate(): Promise<void> {
    const params = {
      grant_type: 'client_credentials',
      scope: 'user.migration',
      client_id: config.apple.client_id,
      client_secret: await this.getSavedAppleKey(),
    };

    const res = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    });

    if (!res.ok) {
      throw new Error(
        `AppleClient authentication error: status ${
          res.statusText
        }, response: ${await res.text()}`
      );
    }

    const body: any = await res.json();
    if (!body?.access_token) {
      throw new Error(
        `AppleClient authentication error: unexpected auth response: ${JSON.stringify(
          body
        )}`
      );
    }

    if (body?.expires_in) {
      console.log(
        `Apple client successfully authenticated, auth expires in ${body.expires_in} seconds`
      );
    }

    // store as Bearer token
    this.access_token = `Bearer ${body.access_token}`;
  }

  /**
   * Request documentation here:
   * https://developer.apple.com/documentation/sign_in_with_apple/transferring_your_apps_and_users_to_another_team#3559106
   *
   * Tries to get a transfer_sub once.
   */
  private async fetchTransferSub(appleSub: string): Promise<Response> {
    const params = {
      sub: appleSub,
      target: config.apple.mozilla_team_id,
      client_id: config.apple.client_id,
      client_secret: await this.getSavedAppleKey(),
    };

    return fetch('https://appleid.apple.com/auth/usermigrationinfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: this.access_token,
      },
      body: new URLSearchParams(params),
    });
  }

  /**
   * Retry manager and validation for transfer_sub requests
   *
   * This returns null if a transfer_sub cannot be successfully provisioned after all retries.
   */
  public async getTransferSub(
    appleIds: AppleSsoIds,
    tries = 0
  ): Promise<string | null> {
    // recursion exit condition
    if (tries >= config.apple.retry_count) {
      return null;
    }
    // if it is the final retry, console.error
    const next = tries + 1;
    const log = next === config.apple.retry_count ? console.error : console.log;
    try {
      const res = await this.fetchTransferSub(appleIds.provider_user_id);

      if (!res.ok) {
        log(
          `AppleClient getTransferSub error: try: ${tries + 1} status ${
            res.statusText
          }, response: ${await res.text()}, ${JSON.stringify(appleIds)}`
        );

        return this.getTransferSub(appleIds, tries + 1);
      }

      const body: any = await res.json();

      if (!body?.transfer_sub) {
        // this probably can't be resolved in this case. Something really weird has happened.
        throw new Error(
          `appleClient getTransferSub - unexpected fetch response: ${JSON.stringify(
            body
          )}`
        );
      }

      return body.transfer_sub;
    } catch (err) {
      // fetch doesn't throw when it gets a HTTP response, this should only be things like
      // network / runtime errors
      log(
        `appleClient getTransferSub - Unexpected error ${
          err?.message ?? err
        }, encountered while processing ${JSON.stringify(appleIds)}`
      );
      return this.getTransferSub(appleIds, tries + 1);
    }
  }

  public async getSavedAppleKey(): Promise<string> {
    if (this.apple_key != undefined) {
      return this.apple_key;
    }

    this.apple_key = await getAppleKey();
    return this.apple_key;
  }
}
