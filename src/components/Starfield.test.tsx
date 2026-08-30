import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Starfield } from './Starfield';

describe('Starfield', () => {
  it('renders stars and nebulae without a space-dust layer', () => {
    const markup = renderToStaticMarkup(<Starfield idPrefix="background-test" />);

    expect(markup).toContain('class="starfield"');
    expect(markup).toContain('class="nebula"');
    expect(markup).not.toContain('space-dust');
  });
});
