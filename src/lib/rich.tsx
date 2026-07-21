// Mini zengin-metin: **kalın** + satır sonları. Markdown motoru değil; AI mesajları için yeterli ve güvenli.

import { Fragment, type ReactNode } from 'react';

export function rich(text: string): ReactNode {
  return text.split('\n').map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : <Fragment key={j}>{part}</Fragment>,
      )}
    </Fragment>
  ));
}
