import axios, { AxiosResponse } from 'axios';
import cheerio from 'cheerio';

const sampleUserAgents = [
  'Mozilla/5.0 (Windows NT 10.; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:15.0) Gecko/20100101 Firefox/15.0.1',
  'Mozilla/5.0 (Linux; Android 5.0.2; SAMSUNG SM-T550 Build/LRX22G) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/3.3 Chrome/38.0.2125.102 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)',
];

function createPagePath(dataSpanId?: string): string {
  return dataSpanId
    ? `https://distrowatch.com/?language=EN&dataspan=${dataSpanId}`
    : `https://distrowatch.com/?language=EN`;
}

async function makeRankingRequest(dataSpan?: string): Promise<AxiosResponse> {
  const pagePath = createPagePath(dataSpan);

  const randomIndex = Math.floor(Math.random() * sampleUserAgents.length);
  const randomUserAgent = sampleUserAgents[randomIndex];

  const response = await axios.get(pagePath, {
    headers: {
      'User-Agent': randomUserAgent,
    },
  });

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
      const distributionLinkElement = $(':nth-child(2) a', rankingDistributionElement);
      return {
        name: distributionLinkElement.text(),
        url: 'https://distrowatch.com/' + distributionLinkElement.attr('href'),
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
