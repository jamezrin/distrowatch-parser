#!/usr/bin/env node

import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import { fetchRanking, fetchDataSpans, fetchAllRankings, DistroWatchRankingType } from './index';

interface ListTypesCommandArguments {
  file: string;
  json: boolean;
}

interface FetchRankingCommandArguments {
  dataSpans: Array<string>;
  file: string;
  json: boolean;
}

async function handleListTypesCommand(args: ListTypesCommandArguments) {
  const dataSpans = await fetchDataSpans();

  if (args.file) {
    const outputFile = path.resolve(__dirname, args.file);
    fs.writeFileSync(outputFile, JSON.stringify(dataSpans));
  }

  if (!args.json) {
    const maxIdLength = Math.max(...dataSpans.map(dataSpan => dataSpan.dataSpanId.length));
    const idEndPadding = Math.max(maxIdLength + 2, 15);
    console.log(`${'Span Id'.padEnd(idEndPadding)} Span Name`);
    dataSpans.forEach(value => {
      console.log(`${value.dataSpanId.padEnd(idEndPadding)} ${value.dataSpanName}`);
    });
  } else {
    console.log(JSON.stringify(dataSpans));
  }
}

async function fetchRankingBySpans(dataSpans: Array<string>) {
  if (dataSpans.includes('all')) {
    const allRankings = await fetchAllRankings();
    return allRankings;
  }

  const allowedDataSpans = await fetchDataSpans();
  const allowedDataSpanIds = allowedDataSpans.map(dataSpan => dataSpan.dataSpanId);

  return Promise.all(
    dataSpans.map(async dataSpan => {
      if (allowedDataSpanIds.includes(dataSpan)) {
        const ranking = await fetchRanking(dataSpan);
        return ranking;
      } else {
        throw new Error(`'${dataSpan}' is not a valid data span`);
      }
    }),
  );
}

async function handleFetchRankingCommand(args: FetchRankingCommandArguments) {
  const rankings = await fetchRankingBySpans(args.dataSpans);

  if (args.file) {
    const outputFile = path.resolve(__dirname, args.file);
    fs.writeFileSync(outputFile, JSON.stringify(rankings));
  }

  if (!args.json) {
    console.log(
      `${'Span Name'.padEnd(25)} ${'Ranking Type'.padEnd(20)} ` +
        `${'Name'.padEnd(20)} ${'Rank'.padEnd(5)} ${'Value'.padEnd(8)} ${'URL (before redirects)'}`,
    );
    rankings.forEach(ranking => {
      const mappedRankingType = DistroWatchRankingType[ranking.rankingType];
      ranking.distributionsRanking.forEach(distribution => {
        console.log(
          `${ranking.dataSpanName.padEnd(25)} ${mappedRankingType.padEnd(20)} ` +
            `${distribution.name.padEnd(20)} ${distribution.rank.toString().padEnd(5)} ` +
            `${distribution.value.toString().padEnd(8)} ${distribution.url}`,
        );
      });
    });
  } else {
    console.log(JSON.stringify(rankings));
  }
}

yargs
  .command(
    ['list-types', 'list-spans', 'list'],
    'list the types of data spans you can choose from',
    yargs => {
      yargs
        .option('file', {
          description: 'also write output in json format to a file',
          alias: 'f',
          type: 'string',
        })
        .option('json', {
          description: 'print json instead of a table',
          alias: 'j',
          type: 'boolean',
        });
    },
    argv => {
      handleListTypesCommand((argv as unknown) as ListTypesCommandArguments);
    },
  )
  .command(
    ['fetch-ranking [data-spans..]', 'get-ranking', 'ranking'],
    'prints out the ranking data in the specified data span(s)',
    yargs => {
      yargs
        .positional('data-spans', {
          description: 'the data span(s) to fetch',
          type: 'string',
          default: ['all'],
        })
        .option('file', {
          description: 'also write output in json format to a file',
          alias: 'f',
          type: 'string',
        })
        .option('json', {
          description: 'print json instead of a table',
          alias: 'j',
          type: 'boolean',
        });
    },
    argv => {
      handleFetchRankingCommand((argv as unknown) as FetchRankingCommandArguments);
    },
  )
  .demandCommand(1, '')
  .strict()
  .wrap(yargs.terminalWidth()).argv;
