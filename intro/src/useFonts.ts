import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

const faces: [string, string, string, string][] = [
  ['Unbounded', 'fonts/unbounded-latin.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F', '200 900'],
  ['Unbounded', 'fonts/unbounded-cyrillic.woff2', 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116', '200 900'],
  ['Onest', 'fonts/onest-latin.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F', '100 900'],
  ['Onest', 'fonts/onest-cyrillic.woff2', 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116', '100 900'],
];

export const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(
      faces.map(async ([family, file, range, weight]) => {
        const f = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, {
          unicodeRange: range,
          weight,
        });
        await f.load();
        (document.fonts as unknown as {add(f: FontFace): void}).add(f);
      }),
    )
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [handle]);
};
