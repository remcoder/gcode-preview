const prefix = 'data:image/jpeg;base64,';

export class Thumbnail {
  public infoParts: string[];
  public size: string;
  public sizeParts: string[];
  public width: number;
  public height: number;
  public charLength: number;
  public chars = '';

  public static parse(thumbInfo: string) : Thumbnail {
    const thumb = new Thumbnail();
    thumb.infoParts = thumbInfo.split(' ');
    thumb.size = thumb.infoParts[0];
    thumb.sizeParts = thumb.size.split('x');
    thumb.width = +thumb.sizeParts[0];
    thumb.height = +thumb.sizeParts[1];
    thumb.charLength = +thumb.infoParts[1];
    return thumb;
  }

  get src() : string {
    return prefix + this.chars;
  } 

  get isValid() : boolean {
    // https://stackoverflow.com/questions/475074/regex-to-parse-or-validate-base64-data/475217#475217
    const base64regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    return this.chars.length == this.charLength && base64regex.test(this.chars);
  }
}