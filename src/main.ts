import { Command } from 'commander';
import { createObjectCsvWriter } from 'csv-writer';
import { EventEmitter } from 'node:events';

import { AppleClient } from './appleClient';
import {
  appleSsoGenerator,
  csvRowGenerator,
  csvRowWriter,
  persistTransferSub,
  provisionTransferSub,
  transferSubGenerator,
} from './phases';
import config from './config';

/**
 * This is the CLI interface that drives this script.
 *
 * Commander is used to gather options, which are then used to dynamically
 * build the contents of a pipeline to drive the migration preparation and
 * csv generation.
 *
 * This process does not exit on its own to prevent premature exiting before
 * all events can be processed.  Ctrl + C to exit manually.
 */

/**
 * Builds a phase 1 pipeline, initializing appleClient if necessary.
 *
 * AppleClient initialization is currently blocked until we enter the transfer
 * period. Remove that throw when it is time.
 *
 * .join phase1 and phase2 into one array to feed into pipeline.
 */
const phase1Builder = async (options, eventEmitter: EventEmitter) => {
  const start = parseInt(options.start, 10);
  const end = parseInt(options.end, 10);

  if (options.skipApple) {
    // just iterate apple_migration directly, no additional event registration needed
    return transferSubGenerator(start, end, eventEmitter);
  } else {
    const appleClient = new AppleClient();
    await appleClient.authenticate();

    eventEmitter.addListener(
      'provisionTransferSub',
      provisionTransferSub(appleClient, eventEmitter)
    );

    eventEmitter.addListener(
      'persistTransferSub',
      persistTransferSub(eventEmitter)
    );

    return appleSsoGenerator(start, end, eventEmitter);
  }
};

/**
 * Builds a phase 2 pipeline, initializing the csvWriter if necessary.
 * @param options
 */
const phase2Builder = async (options, eventEmitter: EventEmitter) => {
  if (options.skipCsv) {
    // do not register any handlers for phase 2
    return;
  } else {
    const csvWriter = createObjectCsvWriter({
      // header: ['transfer_sub', 'fxa_user_id', 'email', 'alternate_emails'],
      header: [
        { id: 'transfer_sub', title: 'transfer_sub' },
        { id: 'fxa_user_id', title: 'fxa_user_id' },
        { id: 'email', title: 'email' },
        { id: 'alternate_emails', title: 'alternate_emails' },
      ],
      path: options.output,
      append: true,
    });

    eventEmitter.addListener('csvRowGenerator', csvRowGenerator(eventEmitter));
    eventEmitter.addListener(
      'csvRowWriter',
      csvRowWriter(csvWriter, eventEmitter)
    );
    return;
  }
};

const program = new Command();

program
  .name('fxa-apple-migration')
  .description(
    'CLI to provision apple `transfer_sub`s, and output CSV to drive fxa apple migration'
  );

program
  .command('migrate')
  .option(
    '-s, --start <id>',
    'Start cursor, user_providers.id if end to end, user_id if --skip-apple',
    '0'
  )
  .option(
    '-e, --end <id>',
    'Last id to process, user_providers.id if end to end, user_id if --skip-apple',
    // 601955 is currently the max id.  give it some extra room for newly provisioned users
    '620000'
  )
  .option('-o, --output <file>', 'File to append csv rows to', 'fxa.csv')
  .option(
    '--skip-apple',
    'Only generate CSV, driving generation from `apple-fxa-migration` table contents'
  )
  .option(
    '--skip-csv',
    'Only populate the `apple-fxa-migration table, skipping writing CSV output'
  )
  .action(async function () {
    const options = this.opts();
    console.log(options);

    const eventEmitter = new EventEmitter();

    const start = await phase1Builder(options, eventEmitter);
    await phase2Builder(options, eventEmitter);

    // add tracking for the total number of CSV rows or transfer_subs completed
    const trackCompletion = (item: string) => {
      let count = 0;

      return () => {
        count += 1;
        if (count % config.database.iterationPageSize === 0) {
          console.log(`completed writing ${item} ${count}`);
        }
      };
    };

    if (options.skipCsv) {
      // if skipCsv there is no listener for 'csvRowGenerator', just track that
      eventEmitter.on(
        'csvRowGenerator',
        trackCompletion('apple_migration row')
      );
    } else {
      // otherwise track on 'finish' events
      eventEmitter.on('finish', trackCompletion('csv row'));
    }

    await start();
  });

program
  .command('one')
  .description('Operate on just one user_id')
  .argument(
    '<id>',
    'id to operate on, user_providers.id if end to end, user_id if --skip-apple'
  )
  .option('-o, --output <file>', 'File to append csv rows to', 'fxa.csv')
  .option(
    '--skip-apple',
    'Only generate CSV, driving generation from `apple-fxa-migration` table contents'
  )
  .option(
    '--skip-csv',
    'Only populate the `apple-fxa-migration table, skipping writing CSV output'
  )
  .action(async function () {
    // prepare options, extracting positional arg into options
    const options = this.opts();
    const [id] = this.args;
    options.start = id;
    options.end = id;
    console.log(options);

    const eventEmitter = new EventEmitter();

    const start = await phase1Builder(options, eventEmitter);
    await phase2Builder(options, eventEmitter);

    await start();
  });

async function main() {
  await program.parseAsync();
}

main();

/**
 * Usually event based processing listens on a socket or something
 * to keep the process alive. This just makes nodejs do nothing every
 * interval period to keep the process running.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
setInterval(() => {}, Number.MAX_SAFE_INTEGER);
