import axios, { AxiosResponse } from 'axios';
import cheerio from 'cheerio';

export function createPagePath(dataSpanId?: string): string {
  return dataSpanId
    ? `https://distrowatch.com/?language=EN&dataspan=${dataSpanId}`
    : `https://distrowatch.com/?language=EN`;
}

export async function makeRankingRequest(dataSpan?: string): Promise<AxiosResponse> {
  const pagePath = createPagePath(dataSpan);
  const response = await axios.get(pagePath);
  return response;
}

export interface DistroWatchRankingDataSpan {
  dataSpanId: string;
  dataSpanName: string;
}

export interface DistroWatchDistribution {
  name: string;
  url: string;
  rank: number;
  value: number;
}

export interface DistroWatchRanking {
  dataSpanName: string;
  distributionsRanking: Array<DistroWatchDistribution>;
  rankingType: DistroWatchRankingType;
}

export enum DistroWatchRankingType {
  UNKNOWN,
  HITS_PER_DAY,
  TRENDING_PAGE_HITS,
  RATING,
}

export async function fetchDataSpans(): Promise<Array<DistroWatchRankingDataSpan>> {
  const response = await makeRankingRequest();
  const $ = cheerio.load(response.data);

  const rankingTableElement = $('table.News')
    .toArray()
    .find(unknownTable => {
      const tableHeadingElement = $('> tbody > tr > th:nth-child(1)', unknownTable);
      return tableHeadingElement.html() === 'Page Hit Ranking';
    });

  const dataSpanSelectElement = $('> tbody > tr > td > form > select', rankingTableElement);

  return $('> option', dataSpanSelectElement)
    .toArray()
    .map((value: CheerioElement) => {
      const dataSpanElement = $(value);
      return {
        dataSpanId: dataSpanElement.attr('value'),
        dataSpanName: dataSpanElement.text(),
      };
    });
}

export function mapRankingType(rankingTypeText: string): DistroWatchRankingType {
  if (rankingTypeText.startsWith('HPD')) {
    return DistroWatchRankingType.HITS_PER_DAY;
  } else if (rankingTypeText.startsWith('Rating')) {
    return DistroWatchRankingType.RATING;
  } else if (rankingTypeText.startsWith('Trend')) {
    return DistroWatchRankingType.TRENDING_PAGE_HITS;
  } else {
    return DistroWatchRankingType.UNKNOWN;
  }
}

export async function fetchRanking(dataSpanId: string): Promise<DistroWatchRanking> {
  const response = await makeRankingRequest(dataSpanId);
  const $ = cheerio.load(response.data);

  const rankingTableElement = $('table.News')
    .toArray()
    .find(unknownTable => {
      const tableHeadingElement = $('> tbody > tr > th:nth-child(1)', unknownTable);
      return tableHeadingElement.html() === 'Page Hit Ranking';
    });

  const rankingTypeElement = $('> tbody > tr > th:nth-child(3)', rankingTableElement);
  const dataSpanSelectElement = $('> tbody > tr > td > form > select', rankingTableElement);
  const rankingDistributionElements = $('> tbody > tr:nth-child(1n+4)', rankingTableElement);

  return {
    dataSpanName: $('> option[selected]', dataSpanSelectElement).text(),
    rankingType: mapRankingType(rankingTypeElement.text()),
    distributionsRanking: rankingDistributionElements.toArray().map(rankingDistributionElement => {
      return {
        name: $(':nth-child(2) a', rankingDistributionElement).text(),
        url: $(':nth-child(2) a', rankingDistributionElement).attr('href'),
        rank: parseInt($(':nth-child(1)', rankingDistributionElement).text()),
        value: parseFloat($(':nth-child(3)', rankingDistributionElement).text()),
      };
    }),
  };
}

export async function fetchAllRankings(): Promise<Array<DistroWatchRanking>> {
  const dataSpans = await fetchDataSpans();
  return Promise.all(
    dataSpans.map(async dataSpan => {
      const ranking = await fetchRanking(dataSpan.dataSpanId);
      return ranking;
    }),
  );
}
