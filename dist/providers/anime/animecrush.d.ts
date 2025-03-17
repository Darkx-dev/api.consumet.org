import { AnimeParser, IAnimeInfo, IAnimeResult, IEpisodeServer, ISearch, ISource, StreamingServers, SubOrSub } from '../../models';
declare class Animecrush extends AnimeParser {
    readonly name = "Animecrush";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    private headers;
    constructor(customBaseURL?: string);
    private static formatImage;
    search(query: string, page?: number): Promise<ISearch<IAnimeResult>>;
    fetchAnimeInfo(animeId: string): Promise<IAnimeInfo>;
    fetchEpisodeSources: (episodeId: string, server?: StreamingServers, subOrDub?: SubOrSub) => Promise<ISource>;
    fetchEpisodeServers(episodeId: string): Promise<IEpisodeServer[]>;
}
export default Animecrush;
