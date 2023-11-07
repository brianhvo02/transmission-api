export default class Transmission {
    sessionId = '';
    rpc: string;

    constructor(host: string, port: number, url: string) {
        this.rpc = `http://${host}:${port}${url}rpc`;
    }

    getSessionId = async () => fetch(this.rpc)
        .then(res => {
            const sessionId = res.headers.get('X-Transmission-Session-Id');
            if (sessionId)
                this.sessionId = sessionId;
        });

    fetch = async <T, U>(method: string, args: U, tag?: number): Promise<T> => 
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

    async torrentAdd(filename: string, options: TorrentAddOptions): Promise<TMResponse<any>>;
    async torrentAdd(metainfo: Buffer, options: TorrentAddOptions): Promise<TMResponse<any>>;
    async torrentAdd(file: string | Buffer, options: TorrentAddOptions) {
        const args: Partial<TorrentAddArgs> = options;
        if (typeof file === 'string')
            args.filename = file;
        else
            args.metainfo = file.toString('base64');

        return this.fetch('torrent-add', args);
    }
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