import kebabCase from 'lodash/kebabCase.js';
import mapKeys from 'lodash/mapKeys.js';

export default class Transmission {
    private sessionId = '';
    private rpc: string;

    constructor(host: string, port: number | string, url: string) {
        this.rpc = `http://${host}:${port}${url}rpc`;
    }

    private getSessionId = async () => fetch(this.rpc)
        .then(res => {
            const sessionId = res.headers.get('X-Transmission-Session-Id');
            if (sessionId)
                this.sessionId = sessionId;
        });

    private fetch = async <T, U>(method: string, args: U, tag?: number): Promise<T> => 
        fetch(this.rpc, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Transmission-Session-Id': this.sessionId
            },
            body: JSON.stringify({
                method,
                arguments: args,
                ...(tag ? { tag } : {})
            })
        })
        .then(async res => {
            if (res.status === 409) {
                await this.getSessionId();
                return this.fetch(method, args);
            }

            return res.json();
        });

    async torrentAdd(filename: string, options?: TorrentAddOptions): Promise<TMResponse<TorrentAddResponse>>;
    async torrentAdd(metainfo: Buffer, options?: TorrentAddOptions): Promise<TMResponse<TorrentAddResponse>>;
    async torrentAdd(file: string | Buffer, options: TorrentAddOptions = {}) {
        const camelArgs: Partial<TorrentAddArgs> = options;
        if (typeof file === 'string')
            camelArgs.filename = file;
        else
            camelArgs.metainfo = file.toString('base64');

        const kebabArgs = mapKeys(camelArgs, (_, key) => kebabCase(key));
        const res = await this.fetch<TMResponse<TorrentAddResponseRaw>, typeof kebabArgs>('torrent-add', kebabArgs);
        const [responseType, info] = Object.entries<TorrentAddResponseInfo>(res.arguments)[0];

        return {
            ...res,
            arguments: {
                responseType,
                ...info
            }
        };
    }

    torrentRemove = async (options: Partial<TorrentRemoveArgs> = {}) =>
        this.fetch<TMResponse<{}>, typeof options>('torrent-remove', options);
}

export interface TMResponse<T> {
    arguments: T;
    result: 'success' | string;
    tag?: number;
}

export interface TorrentAddArgs {
    filename: string;
    metainfo: string;
    cookies: string;
    downloadDir: string;
    labels: string[];
    paused: boolean;
    peerLimit: number;
    bandwidthPriority: number;
    filesWanted: number[];
    filesUnwanted: number[];
    priorityHigh: number[];
    priorityLow: number[];
    priorityNormal: number[];
}

export type TorrentAddOptions = Partial<Omit<TorrentAddArgs, 'filename' | 'metainfo'>>;

export interface TorrentAddResponse extends TorrentAddResponseInfo {
    responseType: 'torrent-added' | 'torrent-duplicate';
}

export type TorrentAddResponseRaw = {
    [key in 'torrent-added' | 'torrent-duplicate']?: TorrentAddResponseInfo
}

export interface TorrentAddResponseInfo {
    id: number;
    name: string;
    hashString: string;
}

export interface TorrentRemoveArgs {
    ids: number | number[];
    deleteLocalData: boolean;
}