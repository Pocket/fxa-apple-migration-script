import { EventEmitter } from 'node:events';

import { AppleSsoIds, CsvRow } from './types';
import { DataService } from './dataService';
import { logDbErrorHandler, readClient, writeClient } from './database/client';
import config from './config';
import { AppleClient } from './appleClient';
import { CsvLookupSeed } from './types';
import { CsvWriter } from 'csv-writer/src/lib/csv-writer';

const ds = new DataService(readClient(), writeClient());

/**
 * This migration process is broken down into 2 separate logical phases:
 *
 * 1. Provision / get `transfer_sub`s
 * 2. Generate CSV rows
 *
 * Ideally, we get this all perfect on the first try for every user, but just in case
 * parts of this process need to be repeated, we can avoid repeating transfer_sub provisioning
 * and just generate the csv rows as an example, starting by iterating the apple_migration table
 * rather than the readitla_auth.user_providers table, or CSV generation can be tested with fake
 * apple_migration table stubs.
 *
 * These phases all act as a map / reduce, and emit events to the next function in the chain
 * as specified in main.ts setup.
 */

/**
 * Phase 1.1, including apple transfer_sub provisioning.
 *
 * This is a generator that will emit many values into the
 * later stages of the pipeline.
 *
 * @param startId - start user_providers.id, inclusive, **this is not a user_id**
 * @param maxId - max user_providers.id, inclusive, **this is not a user_id**
 */
export const appleSsoGenerator = function (
  startId: number,
  maxId: number,
  eventEmitter: EventEmitter
) {
  /**
   * Returns a function that starts execution of the event pipeline so that
   * additional events can be registered before and after setup.
   *
   * Emits many AppleSsoIds to 'provisionTransferSub' event.
   */
  return async function () {
    let batch = 1;
    let cursor = startId;

    while (cursor <= maxId) {
      console.log(`begin processing batch ${batch} starting with id ${cursor}`);
      const idsArray = await ds.iterateAppleSsoIds(cursor, maxId);

      if (idsArray.length === 0) {
        console.log(`batch ${batch} is empty, execution complete?`);
      }

      // get users.user_id for each user
      const withUserIds: AppleSsoIds[] = await Promise.all(
        idsArray.map(async (ids) => {
          const userId = await ds.fetchUserIdByAuthUserId(ids.auth_user_id);
          return {
            ...ids,
            user_id: userId,
          };
        })
      );

      for (const ids of withUserIds) {
        // handle database cruft. Some users are deleted without deleting associated data.
        if (ids.user_id) {
          eventEmitter.emit('provisionTransferSub', ids);
        }
      }

      cursor += config.database.iterationPageSize;
      batch += 1;
    }
  };
};

/**
 * Phase 1.2, provisions transfer subs
 *
 * This requires that the AppleClient is initialized and authenticated.
 *
 * If getTransferSub fails to provision a transfer_sub for the user after
 * it completes its retries, this will not emit, resulting in the user
 * being dropped from the stream pipeline.
 *
 * @param client AppleClient, initialized and authenticated
 * @returns function
 */
export const provisionTransferSub = function (
  client: AppleClient,
  eventEmitter: EventEmitter
) {
  /**
   * Utilize appleClient to generate transfer_sub for a user.
   *
   * Emits a CsvLookupSeed to 'persistTransferSub' event.
   */
  return async function (appleIds: AppleSsoIds) {
    // provision transfer_sub
    const transfer_sub = await client
      .getTransferSub(appleIds)
      .catch(logDbErrorHandler);

    if (transfer_sub) {
      eventEmitter.emit('persistTransferSub', {
        user_id: appleIds.user_id,
        transfer_sub,
      } as CsvLookupSeed);
    }
  };
};

/**
 * Phase 1.3, persist transfer subs to database.
 */
export const persistTransferSub = function (eventEmitter: EventEmitter) {
  /**
   * Emits a CsvLookupSeed to 'csvRowGenerator' event.
   */
  return async function (appleMigrationRow: CsvLookupSeed) {
    const res = await ds
      .writeTransferSub(
        appleMigrationRow.user_id,
        appleMigrationRow.transfer_sub
      )
      .catch(logDbErrorHandler);

    if (res) {
      eventEmitter.emit('csvRowGenerator', appleMigrationRow);
    }
  };
};

/**
 * Alternate entire phase 1 replacement.
 *
 * Requires that transfer_subs are already provisioned and persisted
 * to the `apple_migration` table.
 *
 * This is a generator that will emit many values into the
 * later stages of the pipeline.
 *
 * @param startUserId - start user_id, inclusive
 * @param maxUserId - max user_id, inclusive
 */
export const transferSubGenerator = function (
  startUserId: number,
  maxUserId: number,
  eventEmitter: EventEmitter
) {
  /**
   * Returns a function that starts execution of the event pipeline so that
   * additional events can be registered before and after setup.
   *
   * Emits many CsvLookupSeed to 'csvRowGenerator' event.
   */
  return async function () {
    let batch = 1;
    let cursor = startUserId;

    while (cursor <= maxUserId) {
      console.log(`begin processing batch ${batch} starting with id ${cursor}`);
      const transferSubs = await ds.iterateAppleMigration(cursor, maxUserId);

      if (transferSubs.length === 0) {
        console.log(`batch ${batch} is empty, execution complete?`);
      }

      for (const transferSub of transferSubs) {
        eventEmitter.emit('csvRowGenerator', transferSub);
      }

      cursor += config.database.iterationPageSize;
      batch += 1;
    }
  };
};

/**
 * Phase 2.1, prepare CSV row for writing.
 */
export const csvRowGenerator = function (eventEmitter: EventEmitter) {
  /**
   * Emits a CsvRow to 'csvRowWriter' event.
   */
  return async function (lookupSeed: CsvLookupSeed) {
    const row = await ds.getCsvRow(lookupSeed).catch(logDbErrorHandler);

    if (row) {
      eventEmitter.emit('csvRowWriter', row);
    }
  };
};

/**
 * Phase 2.2, write csv row to file.
 */
export const csvRowWriter = function (
  csvWriter: CsvWriter<CsvRow>,
  eventEmitter: EventEmitter
) {
  /**
   * Emits a CsvRow to 'finish' event.
   */
  return async function (csvRow: CsvRow) {
    await csvWriter.writeRecords([csvRow]);

    eventEmitter.emit('finish', csvRow);
  };
};
