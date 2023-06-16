/* eslint-disable */

/**
 * Quick and dirty helper for generating client secrets for apple auth requests
 *
 * dumps the generated client_secret to the console.
 *
 * setup:
 * ```
 * export APPLE_SSO_PRIVATE_KEY_PEM=`cat <fileLocation>.p8`
 * ```
 *
 * Relevant docs:
 * https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens#3262048
 */

const jose = require('jose');

(async () => {
  const appleSSOJWK = await jose.importPKCS8(
    process.env.APPLE_SSO_PRIVATE_KEY_PEM,
    'ES256',
  );

  // timestamp, in seconds since unix epoch
  const now = Math.floor(Date.now() / 1000);

  const client_secret = await new jose.CompactSign(
    // stringify and to uint8 array
    new TextEncoder().encode(
      JSON.stringify(
        {
          // issued by the pocket team identifier, this is not secret
          iss: 'EX3VH4YFCH',
          // issued at now
          iat: now,
          // expiration, valid for 1 hour
          exp: now + 3600,
          // for consumption by apple oauth APIs
          aud: 'https://appleid.apple.com',
          // subject, client id gets populated here
          sub: 'com.pocket.apple-sso',
        }
      )
    )
  )
    .setProtectedHeader({ 
      alg: 'ES256',
      // this is a key identifier, and is not secret
      kid: '43FMVU4PKT',
    })
    .sign(appleSSOJWK);

  console.log(client_secret);
})();
