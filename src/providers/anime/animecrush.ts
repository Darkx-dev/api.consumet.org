import { load } from 'cheerio';
import {
  AnimeParser,
  IAnimeInfo,
  IAnimeResult,
  IEpisodeServer,
  ISearch,
  ISource,
  StreamingServers,
  SubOrSub,
} from '../../models';
import { MegaCloud, StreamSB, StreamTape, USER_AGENT } from '../../utils';

class Animecrush extends AnimeParser {
  override readonly name = 'Animecrush';
  protected override baseUrl = 'https://api.anicrush.to/shared/v2';
  protected override logo = 'https://anicrush.to/favicon.ico';
  protected override classPath = 'ANIME.Animecrush';

  private headers = {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.6',
    Origin: 'https://anicrush.to',
    referer: 'https://anicrush.to/',
    'user-agent':
      'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
    'x-site': 'anicrush',
  };

  constructor(customBaseURL?: string) {
    super();
    if (customBaseURL?.startsWith('http')) this.baseUrl = customBaseURL;
  }

  private static formatImage(path: string): string {
    if (!path) return '';
    const [name, ext] = path.split('/').pop()?.split('.') || [];
    return `https://static.gniyonna.com/media/poster/300x400/100/${name.split('').reverse().join('')}.${ext}`;
  }

  override async search(query: string, page = 1): Promise<ISearch<IAnimeResult>> {
    try {
      const { data } = await this.client.get(
        `${this.baseUrl}/movie/list?keyword=${query}&limit=20&page=${page}`,
        { headers: this.headers }
      );

      if (!data?.result) throw new Error('Invalid API response');

      return {
        currentPage: page,
        hasNextPage: page < data.result.totalPages,
        totalPages: data.result.totalPages,
        totalResults: data.result.totalResults,
        results: data.result.movies.map((movie: any) => ({
          id: `${movie.slug}.${movie.id}`,
          title: movie.name_english ?? movie.name,
          japaneseTitle: movie.name,
          url: `https://anicrush.to/watch/${movie.slug}.${movie.id}?ref=search`,
          image: Animecrush.formatImage(movie.poster_path),
          cover: Animecrush.formatImage(movie.poster_path),
          type: movie.type,
        })),
      };
    } catch (err) {
      console.error('Search Error:', err);
      throw new Error('Failed to fetch search results');
    }
  }

  override async fetchAnimeInfo(animeId: string): Promise<IAnimeInfo> {
    try {
      const animeIdNum = animeId.split('.').pop();
      const { data } = await this.client.get(`${this.baseUrl}/movie/getById/${animeIdNum}`, {
        headers: this.headers,
      });

      if (!data?.result) throw new Error('Invalid anime data received');

      const result = data.result;
      const episodesResponse = await this.client.get(`${this.baseUrl}/episode/list?_movieId=${animeIdNum}`, {
        headers: this.headers,
      });

      const episodes = Object.values(episodesResponse.data?.result ?? {})
        .flat()
        .map((ep: any) => ({
          title: ep.name_english ?? ep.name,
          number: ep.number,
          id: ep.id,
        }));

      return {
        id: animeId,
        title: result.name_english ?? result.name,
        japaneseTitle: result.name_japanese,
        description: result.overview,
        cover: Animecrush.formatImage(result.poster_path),
        image: Animecrush.formatImage(result.backdrop_path),
        type: result.type,
        genres: result.genres?.map((g: any) => g.name) || [],
        episodes,
        totalEpisodes: episodes.length,
      };
    } catch (err) {
      console.error('Fetch Anime Info Error:', err);
      throw new Error('Failed to fetch anime details');
    }
  }

  override fetchEpisodeSources = async (
    episodeId: string,
    server: StreamingServers = StreamingServers.VidCloud,
    subOrDub: SubOrSub = SubOrSub.SUB
  ): Promise<ISource> => {
    if (episodeId.startsWith('http')) {
      const serverUrl = new URL(episodeId);
      switch (server) {
        case StreamingServers.VidStreaming:
        case StreamingServers.VidCloud:
          return {
            ...(await new MegaCloud().extract(serverUrl, 'https://anicrush.to/')),
          };
        case StreamingServers.StreamSB:
          return {
            headers: {
              Referer: serverUrl.href,
              watchsb: 'streamsb',
              'User-Agent': USER_AGENT,
            },
            sources: await new StreamSB(this.proxyConfig, this.adapter).extract(serverUrl, true),
          };
        case StreamingServers.StreamTape:
          return {
            headers: { Referer: serverUrl.href, 'User-Agent': USER_AGENT },
            sources: await new StreamTape(this.proxyConfig, this.adapter).extract(serverUrl),
          };
        default:
        case StreamingServers.VidCloud:
          return {
            headers: { Referer: serverUrl.href },
            ...(await new MegaCloud().extract(serverUrl, this.baseUrl)),
          };
      }
    }
    try {
      const { data } = await this.client.get(
        `${this.baseUrl}/episode/sources?_movieId=${episodeId.split('$')[0]}&ep=${episodeId
          .split('$')
          .pop()}&sv=4&sc=sub`,
        {
          headers: this.headers,
        }
      );
      return await this.fetchEpisodeSources(data.result.link, server, subOrDub);
    } catch (err) {
      throw new Error("Couldn't find server. Try another server");
    }
  };

  override fetchEpisodeServers(episodeId: string): Promise<IEpisodeServer[]> {
    throw new Error('Method not implemented.');
  }
}

export default Animecrush

// (async () => {
//   const animecrush = new Animecrush();
//   try {
// Test search
// const searchResults = await animecrush.search('One Piece');
// console.log(searchResults);

// Test fetch anime info
// const animeInfo = await animecrush.fetchAnimeInfo('vRPjMA');
// console.log(animeInfo);

// Text fetch sources
// const episodeSources = await animecrush.fetchEpisodeSources('vRPjMA$1');
// console.log(episodeSources);
//   } catch (err) {
// console.error('Test Run Error:', err);
//   }
// })();
