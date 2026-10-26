import { SitemapGenerator } from '../../sitemap/sitemap-generator.class';

/**
 * Suggests the URL most similar to a fragment that matched nothing (Dice coefficient on letter pairs,
 * the algorithm of the `string-similarity` package used by 1.x).
 *
 * @featurePart directive.url-to
 */
export class SuggestBestMatch {

  constructor(
    private urlFragment: string,
    private arrayToSearch: Array<string>
  ) { }

  /** @returns `Did you mean …?`, or '' if there are no URLs. */
  public find(): string {
    let best: string | undefined;
    let bestScore = -1;
    for (const target of this.arrayToSearch) {
      const score = compareTwoStrings(this.urlFragment, target);
      if (score > bestScore) {
        bestScore = score;
        best = target;
      }
    }
    return best ? `Did you mean ${best.replace(SitemapGenerator.fakeHost, '')}?` : '';
  }

}

/**
 * @internal
 */
export function compareTwoStrings(first: string, second: string): number {
  first = first.replace(/\s+/g, '');
  second = second.replace(/\s+/g, '');
  if (first === second)
    return 1;
  if (first.length < 2 || second.length < 2)
    return 0;
  const bigrams = new Map<string, number>();
  for (let i = 0; i < first.length - 1; i++) {
    const bigram = first.substring(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
  }
  let intersection = 0;
  for (let i = 0; i < second.length - 1; i++) {
    const bigram = second.substring(i, i + 2);
    const count = bigrams.get(bigram) || 0;
    if (count > 0) {
      bigrams.set(bigram, count - 1);
      intersection++;
    }
  }
  return (2.0 * intersection) / (first.length + second.length - 2);
}
