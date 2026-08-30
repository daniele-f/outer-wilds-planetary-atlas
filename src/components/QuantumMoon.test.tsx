import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getBody } from '../data/celestialBodies';
import { QuantumMoon } from './QuantumMoon';

function quantumMoon() {
  const body = getBody('quantum-moon');
  if (body === undefined) throw new Error('Quantum Moon fixture is missing.');
  return body;
}

describe('QuantumMoon', () => {
  it('exposes an elusive relocation target without allowing pointer selection', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <QuantumMoon
          body={quantumMoon()}
          hostId="timber-hearth"
          flickering
          selected={false}
          hovered={false}
          hitRadius={23}
          idPrefix="quantum-test"
          onActivate={() => { throw new Error('unstable moon activated'); }}
        />
      </svg>,
    );

    expect(markup).toContain('data-body-id="quantum-moon"');
    expect(markup).toContain('data-quantum-state="unstable"');
    expect(markup).toContain('data-quantum-host="timber-hearth"');
    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('celestial-entity');
  });

  it('keeps selection emphasis without ever rendering a stabilized state or cue', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <QuantumMoon
          body={quantumMoon()}
          hostId="brittle-hollow"
          flickering={false}
          selected
          hovered
          hitRadius={23}
          idPrefix="quantum-test"
          onActivate={() => {}}
        />
      </svg>,
    );

    expect(markup).toContain('data-quantum-state="unstable"');
    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('celestial-entity--selected');
    expect(markup).toContain('celestial-entity--hovered');
    expect(markup).not.toContain('quantum-stable-cue');
    expect(markup).not.toContain('body-focus-ring');
    expect(markup).not.toContain('body-selection-ring');
    expect(markup).toContain('Quantum Moon');
    expect(markup).not.toContain('5 / 5');
  });

  it('keeps the fifth teleport flicker while remaining unstable', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <QuantumMoon
          body={quantumMoon()}
          hostId="giants-deep"
          flickering
          selected={false}
          hovered={false}
          hitRadius={23}
          idPrefix="quantum-fifth"
          onActivate={() => {}}
        />
      </svg>,
    );

    expect(markup).toContain('quantum-moon--flickering');
    expect(markup).toContain('data-quantum-state="unstable"');
    expect(markup).toContain('role="button"');
  });

  it('scopes every procedural SVG definition to its provided instance prefix', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <QuantumMoon body={quantumMoon()} hostId="timber-hearth" flickering={false} selected={false} hovered={false} hitRadius={23} idPrefix="first" onActivate={() => {}} />
        <QuantumMoon body={quantumMoon()} hostId="dark-bramble" flickering={false} selected={false} hovered={false} hitRadius={23} idPrefix="second" onActivate={() => {}} />
      </svg>,
    );
    const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const references = [...markup.matchAll(/url\(#([^\)]+)\)/g)].map((match) => match[1]);

    expect(new Set(ids).size).toBe(ids.length);
    expect(references.length).toBeGreaterThan(0);
    expect(references.every((reference) => ids.includes(reference))).toBe(true);
  });
});
