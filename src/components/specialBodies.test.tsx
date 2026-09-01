import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  getBody,
  type BodyId,
  type CelestialBody as CelestialBodyRecord,
} from '../data/celestialBodies';
import { HourglassTwins } from './HourglassTwins';
import { Interloper } from './Interloper';
import { SolarSystem } from './SolarSystem';

function requireBody(id: BodyId): CelestialBodyRecord {
  const body = getBody(id);
  if (body === undefined) throw new Error(`Missing catalog body: ${id}`);
  return body;
}

describe('HourglassTwins', () => {
  it('renders Ash Twin and Ember Twin as independent accessible targets', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <HourglassTwins
          ashTwin={requireBody('ash-twin')}
          emberTwin={requireBody('ember-twin')}
          selectedId="ash-twin"
          hoveredId={null}
          hitRadii={{ ash: 30, ember: 30 }}
          idPrefix="twins-test"
          onActivate={() => {}}
          onPositionUpdate={() => {}}
        />
      </svg>,
    );

    expect(markup.match(/role="button"/g)).toHaveLength(2);
    expect(markup).toContain('data-body-id="ash-twin"');
    expect(markup).toContain('data-body-id="ember-twin"');
    expect(markup).toContain('aria-label="Ash Twin, Planet"');
    expect(markup).toContain('aria-label="Ember Twin, Planet"');
    expect(markup).toContain('data-sand-stream="ash-twin-to-ember-twin"');
    expect(markup).toContain('data-orbit="hourglass-binary"');
    expect(markup).not.toContain('body-focus-ring');
    expect(markup).not.toContain('body-selection-ring');
  });

  it('highlights the shared orbit and sand beam only for composite hover', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <HourglassTwins
          ashTwin={requireBody('ash-twin')}
          emberTwin={requireBody('ember-twin')}
          selectedId={null}
          hoveredId="hourglass-twins"
          hitRadii={{ ash: 30, ember: 30 }}
          idPrefix="twins-hover-test"
          onActivate={() => {}}
          onPositionUpdate={() => {}}
        />
      </svg>,
    );

    expect(markup).toContain('hourglass-system hourglass-system--hovered');
  });

  it('keeps the composite highlight while Hourglass Twins are selected', () => {
    const markup = renderToStaticMarkup(
      <svg><HourglassTwins ashTwin={requireBody('ash-twin')} emberTwin={requireBody('ember-twin')} selectedId="hourglass-twins" hoveredId={null} hitRadii={{ ash: 30, ember: 30 }} idPrefix="twins-selected-test" onActivate={() => {}} onPositionUpdate={() => {}} /></svg>,
    );
    expect(markup).toContain('hourglass-system hourglass-system--hovered');
  });
});

describe('Interloper', () => {
  it('renders its tail rotated directly away from the Sun at apoapsis', () => {
    const body = requireBody('interloper');
    if (body.orbit === undefined) throw new Error('Interloper orbit fixture is missing.');
    const apoapsisBody: CelestialBodyRecord = {
      ...body,
      orbit: { ...body.orbit, phase: Math.PI },
    };
    const markup = renderToStaticMarkup(
      <svg>
        <Interloper
          body={apoapsisBody}
          selected
          hovered={false}
          hitRadius={23}
          idPrefix="interloper-test"
          onActivate={() => {}}
          onPositionUpdate={() => {}}
        />
      </svg>,
    );

    expect(markup).toContain('data-body-id="interloper"');
    expect(markup).toContain('data-comet-tail="anti-solar"');
    expect(markup).toMatch(/data-comet-tail="anti-solar"[^>]*transform="rotate\((?:180|-180)/);
    expect(markup).toContain('atlas-eccentric-orbit atlas-eccentric-orbit--selected');
    expect(markup).not.toContain('atlas-eccentric-orbit__ghost');
    expect(markup).not.toContain('body-focus-ring');
    expect(markup).not.toContain('body-selection-ring');
  });
});

describe('SolarSystem special-body integration', () => {
  it('places all three special bodies in the shared hit layer and visual scene', () => {
    const markup = renderToStaticMarkup(
      <SolarSystem selectedId={null} onSelect={() => {}} />,
    );

    for (const id of ['ash-twin', 'ember-twin', 'interloper'] as const) {
      expect(markup).toContain(`data-hit-body-id="${id}"`);
      expect(markup).toContain(`data-body-id="${id}"`);
    }
  });

  it('renders the unstable Quantum Moon with a relocation hit target', () => {
    const markup = renderToStaticMarkup(
      <SolarSystem selectedId={null} onSelect={() => {}} />,
    );

    expect(markup).toContain('data-body-id="quantum-moon"');
    expect(markup).toContain('data-quantum-state="unstable"');
    expect(markup).toContain('data-hit-body-id="quantum-moon"');
  });
});
