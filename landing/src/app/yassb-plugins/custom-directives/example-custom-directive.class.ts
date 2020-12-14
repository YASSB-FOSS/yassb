import { YassbDirective, YassbDirectiveProps, YassbDirectiveResponse } from '../../../../../bundle';

export class ExampleCustomDirective implements YassbDirective {

  public static regex: RegExp = /<!--\s*example-custom\s*=\s*".+\..+"\s*-->/g;

  constructor(
    private args: YassbDirectiveProps
  ) { }

  public init(): YassbDirectiveResponse {
    return { html: this.args.fileContents, data: {} };
  }

}
