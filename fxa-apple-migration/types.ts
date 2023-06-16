/**
 * Interface containing the data needed to provision a transfer_sub
 * and then persist it to apple_migration
 *
 * These are all sourced from the readitla_auth tables users and
 * user_providers.
 */
export interface AppleSsoIds {
  /** user_providers.id, included for potential error logs */
  id: number;
  auth_user_id: string;
  /** This is users.user_id */
  user_id?: number;
  /** pocket apple organization user identifier */
  provider_user_id: string;
}

/**
 * Interface containing the data needed to drive looking up a CSV row, or
 * to build a row of the apple_migration table.
 *
 * This is a midway checkpoint of CSV generation. If this data is already
 * persisted to the apple_migration table, this may be looked up directly
 * from there with `--skip-apple`
 */
export interface CsvLookupSeed {
  user_id: number;
  /** shared apple user identifier */
  transfer_sub: string;
}

/**
 * Data actually output to a CSV row.
 */
export interface CsvRow {
  /** shared apple user identifier */
  transfer_sub: string;
  /** firefox accounts user identifier */
  fxa_user_id: string;
  /** primary email */
  email: string;
  /** all alternate emails, ':' delimited as requested by fxa */
  alternate_emails: string;
}
