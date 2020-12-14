/**
 * Extracts the first occurence of a level 1 title `# [title]` from a MarkDown file.
 *
 * @param mdContents content of the MarkDown file.
 * @returns the title extracted, if any was found.
 */
export function mdTitleExtractor(mdContents: string): string {
  const regExResult = mdContents.match(/^# .+/gm);
  if (!regExResult)
    return;
  return regExResult[0].replace('# ', '');
}
