export declare class Thumbnail {
    size: string;
    width: number;
    height: number;
    charLength: number;
    chars: string;
    static parse(thumbInfo: string): Thumbnail;
    get src(): string;
    get isValid(): boolean;
}
