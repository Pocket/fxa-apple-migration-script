import jose from 'jose';
import config from './config';

/*
 * Relevant docs:
 * https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens#3262048
 */

export const getAppleKey = async () => {
  const appleSSOJWK = await jose.importPKCS8(
    config.apple.private_key_pem,
    'ES256'
  );

  // timestamp, in seconds since unix epoch
  const now = Math.floor(Date.now() / 1000);

  const client_secret = await new jose.CompactSign(
    // stringify and to uint8 array
    new TextEncoder().encode(
      JSON.stringify({
        // issued by the pocket team identifier, this is not secret
        iss: config.apple.pocket_team_id,
        // issued at now
        iat: now,
        // expiration, valid for 1 hour
        exp: now + 3600,
        // for consumption by apple oauth APIs
        aud: 'https://appleid.apple.com',
        // subject, client id gets populated here
        sub: config.apple.client_id,
      })
    )
  )
    .setProtectedHeader({
      alg: 'ES256',
      // this is a key identifier, and is not secret
      kid: config.apple.private_key_id,
    })
    .sign(appleSSOJWK);

  return client_secret;
};
