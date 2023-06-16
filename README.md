# fxa-apple-migration

This script drives the migration of pocket users from the pocket apple organization to the mozilla apple organization.

This should be cleaned up after that migration is complete. More notes on how to use this script, the intended lifecycle, and cleanup steps can be found in `./fxa-apple-migration`.

## other files

- `./generateClientSecret.js` - helper script for generating Apple `client_secret`s.
- `./schema.sql` - a point in time snapshot of sql tables this operates against.