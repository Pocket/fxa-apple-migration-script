import { Knex } from 'knex';
import config from './config';

import { AppleSsoIds, CsvLookupSeed, CsvRow } from './types';

/**
 * There is some very unintuitive column naming going on in here.
 *
 * Trying to keep everything as well documented as possible. Please read all
 * comments carefully and do not make assumptions if you have to change things
 * here.
 */

export class DataService {
  private readDb: Knex;
  private writeDb: Knex;

  constructor(readDb, writeDb) {
    this.readDb = readDb;
    this.writeDb = writeDb;
  }

  /**
   * A starting point for iterating users.
   *
   * This returns a page (config defined size) of pocket user_id and apple user identifier tuples.
   *
   * This uses the local `user_providers.id` to drive iteration for index performance
   * reasons.
   *
   * Returns a single pair when startId matches maxId, or begins returning empty results
   * when startId exceeds maxId.
   *
   * @param startId - start user_providers.id, inclusive, **this is not a user_id**
   * @param maxId - max user_providers.id, inclusive, **this is not a user_id**
   */
  public async iterateAppleSsoIds(
    startId: number,
    maxId: number
  ): Promise<AppleSsoIds[]> {
    return (
      this.readDb<AppleSsoIds>('readitla_auth.user_providers')
        // **the user_id in this table is not the same as readitla_ril-tmp.users.user_id!**
        .select(
          'user_providers.id as id',
          'users.external_key as auth_user_id',
          'user_providers.provider_user_id as provider_user_id'
        )
        // this is inclusive
        .whereBetween('user_providers.id', [startId, maxId])
        // only apple should be in here, but specify provider_id 4 just in case
        .where('user_providers.provider_id', 4)
        .orderBy('user_providers.id', 'asc')
        .limit(config.database.iterationPageSize)
        // inner join
        // if users row doesn't exist we cannot map to readitla.ril-tmp.users
        // if user_providers doesn't exist, we do not know apple sub
        .innerJoin(
          'readitla_auth.users',
          'readitla_auth.users.id',
          'readitla_auth.user_providers.user_id'
        )
    );
  }

  /**
   * Alternate starting point. If all `transfer_sub`s have already been generated,
   * just start at iterating the `apple_migration` table for CSV generation.
   *
   * Note, this is actually user_id, unlike iterateAppleSsoIds.
   *
   * Returns a single pair when startId matches maxId, or begins returning empty results
   * when startUserId exceeds maxUserId.
   *
   * @param startUserId - start user_id, inclusive
   * @param maxUserId - max user_id, inclusive
   */
  public async iterateAppleMigration(
    startUserId: number,
    maxUserId: number
  ): Promise<CsvLookupSeed[]> {
    return (
      this.readDb<CsvLookupSeed>('apple_migration')
        .select('user_id', 'transfer_sub')
        // this is inclusive
        .whereBetween('user_id', [startUserId, maxUserId])
        // ignore users that are marked with completed migration
        .andWhere('migrated', 0)
        .orderBy('user_id', 'asc')
        .limit(config.database.iterationPageSize)
    );
  }

  /**
   * Persist a transfer_sub to the database.
   *
   * This will create a new row if user_id isn't present,
   * or update transfer_sub if a row with user_id is already
   * present.
   */
  public async writeTransferSub(userId: number, transferSub: string) {
    return this.writeDb('apple_migration')
      .insert({
        user_id: userId,
        transfer_sub: transferSub,
        migrated: 0,
      })
      .onConflict('user_id')
      .merge('transfer_sub');
  }

  /**
   * Gets the primary email and firefox accounts identifier for a user by user_id.
   */
  public async fetchUserDataByUserId(userId: number): Promise<Partial<CsvRow>> {
    return (
      this.readDb<Partial<CsvRow>>('users')
        .select(
          'users.email as email',
          'user_firefox_account.firefox_uid as fxa_user_id'
        )
        .where('users.user_id', userId)
        // left outer join
        // we always want users
        // firefox account may not exist
        .leftOuterJoin(
          'user_firefox_account',
          'users.user_id',
          'user_firefox_account.user_id'
        )
        .first()
    );
  }

  /**
   * Get user_id by auth_user_id
   */
  public async fetchUserIdByAuthUserId(authUserId: string): Promise<number> {
    const res = await this.readDb<{ user_id: number }>('users')
      .select('user_id')
      .where('users.auth_user_id', authUserId)
      .first();
    return res?.user_id;
  }

  /**
   * Gets all alternate emails for a user, and returns them
   * as a colon delimited list.
   *
   * This is separate from fetchUserData for several reasons:
   * - performance, potentially many aliases for a single user
   * - user_id, service_id, username compound key is the only index present
   *
   * This is definitely the big database performance hit of running this entire
   * script.
   *
   * This query is only necessary for users with both a apple and fxa SSO.
   */
  public async fetchAlternateEmails(userId: number): Promise<string> {
    const alternates = await this.readDb<{ username: string }>('users_services')
      .select('username')
      .where('user_id', userId)
      // email aliases are service_id 2
      .andWhere('service_id', 2)
      // only select validated emails
      .andWhere('confirmed', 1);
    return alternates.map((a) => a?.username).join(':');
  }

  /**
   * Aggregate all data for a user into a CSV row interface starting
   * from an apple_migration row
   */
  public async getCsvRow(seed: CsvLookupSeed): Promise<CsvRow> {
    const userData = await this.fetchUserDataByUserId(seed.user_id);

    if (userData.fxa_user_id) {
      // for users with a firefox account, fxa requires alternate emails
      const alternateEmails = await this.fetchAlternateEmails(seed.user_id);
      return {
        transfer_sub: seed.transfer_sub,
        fxa_user_id: userData.fxa_user_id,
        email: userData.email,
        alternate_emails: alternateEmails,
      };
    } else {
      // otherwise just return the rest
      return {
        transfer_sub: seed.transfer_sub,
        fxa_user_id: userData.fxa_user_id,
        email: userData.email,
        alternate_emails: '',
      };
    }
  }
}
