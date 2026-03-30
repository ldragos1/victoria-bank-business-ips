/**
 * Strip trailing `/` without regex (linear time; avoids ReDoS on uncontrolled URLs).
 */
export function trimTrailingSlashes(s: string): string {
  let i = s.length;
  while (i > 0 && s[i - 1] === "/") i -= 1;
  return i === s.length ? s : s.slice(0, i);
}
