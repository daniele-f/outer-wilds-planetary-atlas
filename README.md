# Outer Wilds Planetary Atlas

An interactive, spoiler-conscious atlas of the *Outer Wilds* solar system. The project uses React, TypeScript, Vite, CSS, and procedural SVG artwork—no backend or external game assets required.

## Features

- Animated planets, moons, nested orbits, and selectable celestial bodies
- Binary Hourglass Twins with a reversing sand-transfer animation
- Eccentric Interloper orbit with an anti-solar comet tail
- Quantum Moon proximity escapes and five-escape stabilization behavior
- Mouse, keyboard, and touch-friendly pan and zoom controls
- Responsive information panel and reduced-motion support

## Run locally with PowerShell

On Windows, you can also double-click **Run Atlas.bat** in the project folder. It installs missing dependencies, starts the development server, and opens the atlas in your browser.

Open PowerShell and run:

```powershell
npm ci
npm run dev
```

Vite will print a local address. Open it in your browser—normally:

```text
http://localhost:5173
```

Press `Ctrl+C` in PowerShell to stop the development server.

## Tests

Run the complete test suite once:

```powershell
npm test -- --run
```

Run tests in watch mode while developing:

```powershell
npm test
```

## Production build

Create an optimized build:

```powershell
npm run build
```

The generated site is written to the `dist` directory.

Preview the production build locally:

```powershell
npx vite preview
```

Then open the local address printed by Vite.

## Troubleshooting

If PowerShell reports that `npm` is unknown or that `npm-cli.js` is missing, reinstall the current Node.js LTS release, close and reopen PowerShell, and repeat the setup commands.
