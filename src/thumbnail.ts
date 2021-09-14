const prefix = 'data:image/jpeg;base64,';

export class Thumbnail {
  public size: string;
  public width: number;
  public height: number;
  public charLength: number;
  public chars = '';

  public static parse(thumbInfo: string) : Thumbnail {
    const thumb = new Thumbnail();
    const infoParts = thumbInfo.split(' ');
    thumb.size = infoParts[0];
    const sizeParts = thumb.size.split('x');
    thumb.width = +sizeParts[0];
    thumb.height = +sizeParts[1];
    thumb.charLength = +infoParts[1];
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