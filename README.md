# OpenVMS Field Notes

A static site for getting started with OpenVMS x86-64 V9.2-3:

- **Cheat sheet** (`/`): everyday DCL commands with Unix equivalents, a live filter, and click-to-copy.
- **Run it on a Mac** (`/qemu`): step-by-step setup of OpenVMS under a patched QEMU (TCG) on Apple Silicon.

The Mac walkthrough is based on astr0baby's guide,
[Running OpenVMS 9.2-3 (x86_64) on macOS arm64 with QEMU TCG](https://astr0baby.online/OpenVMS/QEMU_TCG/),
which supplies the QEMU patches and the boot recipe. Credit for that work goes to them.

## Development

Built with SvelteKit and `@sveltejs/adapter-static`; every page is prerendered.

```bash
npm install
npm run dev      # local dev server
npm run build    # static output in ./build
npm run preview  # serve the build locally
```

## Deploying

Import the repo into Vercel. It detects SvelteKit, runs `npm run build`, and serves the prerendered pages; no extra config is needed.
