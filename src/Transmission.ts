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

    async torrentGet<T extends TorrentInfoKeys>(fields: T[], options?: TorrentGetOptions) {
        const args = {
            fields: [...new Set(fields)],
            ...options
        };

        return this.fetch<TMResponse<TorrentGetResponse<T>>, typeof args>('torrent-get', args);
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

export interface TorrentGetArgs {
    fields: TorrentInfoKeys[];
    ids: number[];
}

export type TorrentGetOptions = Partial<Omit<TorrentGetArgs, 'fields'>>;

export type TorrentGetResponse<T extends TorrentInfoKeys> = Pick<TorrentInfo, T>[];

export type TorrentInfoKeys = keyof TorrentInfo;
export interface TorrentInfo {
    activityDate: number;
    addedDate: number;
    availability: number[];
    bandwidthPriority: number;
    comment: string;
    corruptEver: number;
    creator: string;
    dateCreated: number;
    desiredAvailable: number;
    doneDate: number;
    downloadDir: string;
    downloadedEver: number;
    downloadLimit: number;
    downloadLimited: boolean;
    editDate: number;
    error: number;
    errorString: string;
    eta: number;
    etaIdle: number;
    fileCount: number;
    files: File[];
    fileStats: FileStats[];
    group: string;
    hashString: string;
    haveUnchecked: number;
    haveValid: number;
    honorsSessionLimits: boolean;
    id: number;
    isFinished: boolean;
    isPrivate: boolean;
    isStalled: boolean;
    labels: string[];
    leftUntilDone: number;
    magnetLink: string;
    manualAnnounceTime: number;
    maxConnectedPeers: number;
    metadataPercentComplete: number;
    name: string;
    peerLimit: number;
    peers: Peer[];
    peersConnected: number;
    peersFrom: PeersFrom;
    peersGettingFromUs: number;
    peersSendingToUs: number;
    percentComplete: number;
    percentDone: number;
    pieces: string;
    pieceCount: number;
    pieceSize: number;
    priorities: number[];
    primaryMimeType: string;
    queuePosition: number;
    rateDownload: number;
    rateUpload: number;
    recheckProgress: number;
    secondsDownloading: number;
    secondsSeeding: number;
    seedIdleLimit: number;
    seedIdleMode: number;
    seedRatioLimit: number;
    seedRatioMode: number;
    sequentialDownload: boolean;
    sizeWhenDone: number;
    startDate: number;
    status: Status;
    trackers: Tracker[];
    trackerList: string;
    trackerStats: TrackerStats[];
    totalSize: number;
    torrentFile: string;
    uploadedEver: number;
    uploadLimit: number;
    uploadLimited: boolean;
    uploadRatio: number;
    wanted: number[];
    webseeds: string[];
    webseedsSendingToUs: number;
}

export interface File {
    bytesCompleted: number;
    length: number;
    name: string;
    beginPiece: number;
    endPiece: number;
}

export interface FileStats {
    bytesCompleted: number;
    wanted: 0 | 1;
    priority: number;
}

export interface Peer {
    address: string;
    clientName: string;
    clientIsChoked: boolean;
    clientIsInterested: boolean;
    flagStr: string;
    isDownloadingFrom: boolean;
    isEncrypted: boolean;
    isIncoming: boolean;
    isUploadingTo: boolean;
    isUTP: boolean;
    peerIsChoked: boolean;
    peerIsInterested: boolean;
    port: number;
    progress: number;
    rateToClient: number;
    rateToPeer: number;
}

export interface PeersFrom {
    fromCache: number;
    fromDht: number;
    fromIncoming: number;
    fromLpd: number;
    fromLtep: number;
    fromPex: number;
    fromTracker: number;
}

export enum Status {
    STOPPED,
    VERIFY_QUEUE,
    VERIFY,
    DOWNLOAD_QUEUED,
    DOWNLOAD,
    SEED_QUEUED,
    SEED
}

export interface Tracker {
    announce: string;
    id: number;
    scrape: string;
    sitename: string;
    tier: number;
}

export interface TrackerStats {
    announceState: number;
    announce: string;
    downloadCount: number;
    hasAnnounced: boolean;
    hasScraped: boolean;
    host: string;
    id: number;
    isBackup: boolean;
    lastAnnouncePeerCount: number;
    lastAnnounceResult: string;
    lastAnnounceStartTime: number;
    lastAnnounceSucceeded: boolean;
    lastAnnounceTime: number;
    lastAnnounceTimedOut: boolean;
    lastScrapeResult: string;
    lastScrapeStartTime: number;
    lastScrapeSucceeded: boolean;
    lastScrapeTime: number;
    lastScrapeTimedOut: boolean;
    leecherCount: number;
    nextAnnounceTime: number;
    nextScrapeTime: number;
    scrapeState: number;
    scrape: string;
    seederCount: number;
    sitename: string;
    tier: number;
}