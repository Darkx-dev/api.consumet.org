"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../models");
const utils_1 = require("../../utils");
class Animecrush extends models_1.AnimeParser {
    constructor(customBaseURL) {
        super();
        this.name = 'Animecrush';
        this.baseUrl = 'https://api.anicrush.to/shared/v2';
        this.logo = 'https://anicrush.to/favicon.ico';
        this.classPath = 'ANIME.Animecrush';
        this.headers = {
            accept: 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.6',
            Origin: 'https://anicrush.to',
            referer: 'https://anicrush.to/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
            'x-site': 'anicrush',
        };
        this.fetchEpisodeSources = async (episodeId, server = models_1.StreamingServers.VidCloud, subOrDub = models_1.SubOrSub.SUB) => {
            if (episodeId.startsWith('http')) {
                const serverUrl = new URL(episodeId);
                switch (server) {
                    case models_1.StreamingServers.VidStreaming:
                    case models_1.StreamingServers.VidCloud:
                        return {
                            ...(await new utils_1.MegaCloud().extract(serverUrl, 'https://anicrush.to/')),
                        };
                    case models_1.StreamingServers.StreamSB:
                        return {
                            headers: {
                                Referer: serverUrl.href,
                                watchsb: 'streamsb',
                                'User-Agent': utils_1.USER_AGENT,
                            },
                            sources: await new utils_1.StreamSB(this.proxyConfig, this.adapter).extract(serverUrl, true),
                        };
                    case models_1.StreamingServers.StreamTape:
                        return {
                            headers: { Referer: serverUrl.href, 'User-Agent': utils_1.USER_AGENT },
                            sources: await new utils_1.StreamTape(this.proxyConfig, this.adapter).extract(serverUrl),
                        };
                    default:
                    case models_1.StreamingServers.VidCloud:
                        return {
                            headers: { Referer: serverUrl.href },
                            ...(await new utils_1.MegaCloud().extract(serverUrl, this.baseUrl)),
                        };
                }
            }
            try {
                const { data } = await this.client.get(`${this.baseUrl}/episode/sources?_movieId=${episodeId.split('$')[0]}&ep=${episodeId
                    .split('$')
                    .pop()}&sv=4&sc=sub`, {
                    headers: this.headers,
                });
                return await this.fetchEpisodeSources(data.result.link, server, subOrDub);
            }
            catch (err) {
                throw new Error("Couldn't find server. Try another server");
            }
        };
        if (customBaseURL === null || customBaseURL === void 0 ? void 0 : customBaseURL.startsWith('http'))
            this.baseUrl = customBaseURL;
    }
    static formatImage(path) {
        var _a;
        if (!path)
            return '';
        const [name, ext] = ((_a = path.split('/').pop()) === null || _a === void 0 ? void 0 : _a.split('.')) || [];
        return `https://static.gniyonna.com/media/poster/300x400/100/${name.split('').reverse().join('')}.${ext}`;
    }
    async search(query, page = 1) {
        try {
            const { data } = await this.client.get(`${this.baseUrl}/movie/list?keyword=${query}&limit=20&page=${page}`, { headers: this.headers });
            if (!(data === null || data === void 0 ? void 0 : data.result))
                throw new Error('Invalid API response');
            return {
                currentPage: page,
                hasNextPage: page < data.result.totalPages,
                totalPages: data.result.totalPages,
                totalResults: data.result.totalResults,
                results: data.result.movies.map((movie) => {
                    var _a;
                    return ({
                        id: `${movie.slug}.${movie.id}`,
                        title: (_a = movie.name_english) !== null && _a !== void 0 ? _a : movie.name,
                        japaneseTitle: movie.name,
                        url: `https://anicrush.to/watch/${movie.slug}.${movie.id}?ref=search`,
                        image: Animecrush.formatImage(movie.poster_path),
                        cover: Animecrush.formatImage(movie.poster_path),
                        type: movie.type,
                    });
                }),
            };
        }
        catch (err) {
            console.error('Search Error:', err);
            throw new Error('Failed to fetch search results');
        }
    }
    async fetchAnimeInfo(animeId) {
        var _a, _b, _c, _d;
        try {
            const animeIdNum = animeId.split('.').pop();
            const { data } = await this.client.get(`${this.baseUrl}/movie/getById/${animeIdNum}`, {
                headers: this.headers,
            });
            if (!(data === null || data === void 0 ? void 0 : data.result))
                throw new Error('Invalid anime data received');
            const result = data.result;
            const episodesResponse = await this.client.get(`${this.baseUrl}/episode/list?_movieId=${animeIdNum}`, {
                headers: this.headers,
            });
            const episodes = Object.values((_b = (_a = episodesResponse.data) === null || _a === void 0 ? void 0 : _a.result) !== null && _b !== void 0 ? _b : {})
                .flat()
                .map((ep) => {
                var _a;
                return ({
                    title: (_a = ep.name_english) !== null && _a !== void 0 ? _a : ep.name,
                    number: ep.number,
                    id: ep.id,
                });
            });
            return {
                id: animeId,
                title: (_c = result.name_english) !== null && _c !== void 0 ? _c : result.name,
                japaneseTitle: result.name_japanese,
                description: result.overview,
                cover: Animecrush.formatImage(result.poster_path),
                image: Animecrush.formatImage(result.backdrop_path),
                type: result.type,
                genres: ((_d = result.genres) === null || _d === void 0 ? void 0 : _d.map((g) => g.name)) || [],
                episodes,
                totalEpisodes: episodes.length,
            };
        }
        catch (err) {
            console.error('Fetch Anime Info Error:', err);
            throw new Error('Failed to fetch anime details');
        }
    }
    fetchEpisodeServers(episodeId) {
        throw new Error('Method not implemented.');
    }
}
exports.default = Animecrush;
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
//# sourceMappingURL=animecrush.js.map