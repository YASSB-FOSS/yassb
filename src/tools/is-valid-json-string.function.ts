/**
 * Checks if a string is a valid JSON formatted string.
 *
 * @param jsonString String to be checkd
 *
 * @see
 * https://stackoverflow.com/questions/3710204/how-to-check-if-a-string-is-a-valid-json-string-in-javascript-without-using-try
 */
export function isValidJsonString(jsonString: string): boolean {

  if (!(jsonString && typeof jsonString === 'string')) {
    return false;
  }

  try {
    JSON.parse(jsonString);
    return true;
  } catch (error) {
    return false;
  }

}
