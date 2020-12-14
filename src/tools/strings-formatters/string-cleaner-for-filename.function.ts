/**
 * Cleans strings from special characters so it can safely be used in filenames.
 *
 * @param source the string to clean.
 * @returns the cleaned string.
 */
export function cleanString(source: string): string {
  let r = source.toLowerCase();
  const NON_ASCIIS = {
    a: '[àáâãäå]',
    ae: 'æ',
    c: 'ç',
    e: '[èéêë]',
    i: '[ìíîï]',
    n: 'ñ',
    o: '[òóôõö]',
    oe: 'œ',
    u: '[ùúûűü]',
    y: '[ýÿ]'
  };
  for (const i in NON_ASCIIS)
    r = r.replace(new RegExp(NON_ASCIIS[i], 'g'), i);

  return r.replace(/\s/g, '-')
    .replace(/--/g, '-')
    .replace(/[^\w\-]/gi, '');
}
