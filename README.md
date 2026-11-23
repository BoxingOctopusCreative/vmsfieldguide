# OpenVMS Field Notes

A static site for getting started with OpenVMS x86-64 V9.2-3:

- **Cheat Sheet** (`/`): everyday DCL commands and concepts, with a live filter and click-to-copy.
- **VMS vs. Unix** (`/compare`): DCL commands side by side with their closest Unix, Linux and macOS equivalents.
- **Why VMS?** (`/why`): where OpenVMS still has an edge over modern Unix and Linux, and where it doesn't.
- **Run It on a Mac** (`/qemu`): step-by-step setup of OpenVMS under a patched QEMU (TCG) on Apple Silicon,
  plus a quickstart script served at `/install/mac.sh`.
- **Run It on a PC** (`/pc`): OpenVMS on x86 under KVM, VirtualBox or VMware, and what to expect from bare metal.

The Mac walkthrough is based on astr0baby's guide,
[Running OpenVMS 9.2-3 (x86_64) on macOS arm64 with QEMU TCG](https://astr0baby.online/OpenVMS/QEMU_TCG/),
which supplies the QEMU patches and the boot recipe. Credit for that work goes to them. The quickstart script
downloads those patches from the guide at run time and checks them against known checksums.

OpenVMS and the OpenVMS logo are trademarks of VMS Software, Inc. This is an unofficial reference.

## Development

Built with SvelteKit and `@sveltejs/adapter-static`; every page is prerendered.

```bash
npm install
npm run dev      # local dev server
npm run check    # type-check
npm run build    # static output in ./build
npm run preview  # serve the build locally
```

## Deploying

Import the repo into Vercel. It detects SvelteKit, runs `npm run build`, and serves the prerendered pages; no extra
config is needed.

Canonical URLs, Open Graph tags, `robots.txt` and the sitemap need the site's absolute address. On Vercel it comes from
the production domain automatically; set `SITE_URL` (for example `https://vms.example.com`) to use a custom domain.

---

A [Boxing Octopus Creative](https://boxingoctop.us) Project.
