#!/usr/bin/env node

import yargs from 'yargs';
import * as provider from './provider';

async function queryDataSpanTypes(): Promise<any> {
  const dataSpans = await provider.fetchDataSpans();

  dataSpans.forEach(value => {
    console.log(`${value.dataSpanId.padEnd(15)} ${value.dataSpanName}`);
  });
}

async function queryRanking(dataSpans: Array<string>): Promise<any> {
  if (!dataSpans.includes('all')) {
    const allowedDataSpans = await provider.fetchDataSpans();
    const allowedDataSpanIds = allowedDataSpans.map(dataSpan => dataSpan.dataSpanId);

    dataSpans.forEach(async dataSpan => {
      if (allowedDataSpanIds.includes(dataSpan)) {
        const ranking = await provider.fetchRanking(dataSpan);
        console.log(JSON.stringify(ranking));
      } else {
        console.error(`'${dataSpan}' is not a valid data span, run 'distrowatch list-types'`);
      }
    });
  } else {
    const allRankings = await provider.fetchAllRankings();
    console.log(JSON.stringify(allRankings));
  }
}

yargs
  .command(
    ['list-types', 'list-spans', 'list'],
    'list the types of data spans you can choose from',
    () => {},
    () => {
      queryDataSpanTypes();
    },
  )
  .command(
    ['fetch-ranking [data-spans..]', 'get-ranking', 'ranking'],
    'fetches the ranking',
    yargs => {
      yargs.positional('data-spans', {
        describe: 'the data span(s) to fetch',
        type: 'string',
        default: ['all'],
      });
    },
    argv => {
      queryRanking(argv.dataSpans as Array<string>);
    },
  )
  .demandCommand(1, '')
  .strict()
  .wrap(yargs.terminalWidth()).argv;
