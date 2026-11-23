<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import CodeBlock from '#lib/CodeBlock.svelte';
	import { highlight } from '#lib/highlight.js';
	import { copyText } from '#lib/copy.js';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { siteUrl } from '#lib/site.js';

	// Absolute URL of the quickstart script. The prerendered HTML uses the build-time site address;
	// in the browser it always switches to the address this page was actually loaded from, so the
	// command is right on localhost, Vercel previews, production and any custom domain.
	let origin = $state(siteUrl || 'https://your-site');
	onMount(() => {
		origin = location.origin;
	});
	let script = $derived(`${origin}/install/mac.sh`);

	const GUIDE = 'https://astr0baby.online/OpenVMS/QEMU_TCG/';
	const PATCH1 = GUIDE + '01-lapic-timer-fix.patch';
	const PATCH2 = GUIDE + '02-max-insns-per-tb.patch';

	const steps = [
		['sdl', 'Build SDL2'],
		['socat', 'Build socat'],
		['patch', 'Clone and Patch QEMU'],
		['build', 'Configure and Build QEMU'],
		['sign', 'Copy and Sign the Binaries'],
		['image', 'Get and Convert the OpenVMS Image'],
		['script', 'Write the Boot Script'],
		['boot', 'First Boot'],
		['trim', 'Trim Startup Services'],
		['snapshot', 'Save a Snapshot'],
		['connect', 'Connect over SSH, Telnet or FTP']
	];

	// Run on the Mac, from the folder that holds boot-vms.sh.
	const daily = [
		{ cmd: './boot-vms.sh', desc: 'Start the VM. At <code>BOOTMGR&gt;</code> type <code>OPA0</code>, then <code>BOOT</code>.' },
		{ cmd: 'ssh -p 2222 -o ConnectTimeout=120 system@127.0.0.1', desc: 'Log in over SSH once startup has finished.' },
		{ cmd: 'telnet 127.0.0.1 2223', desc: 'Telnet login. Unencrypted, but traffic stays on your machine.' },
		{ cmd: 'ftp -P 2221 127.0.0.1', desc: 'FTP into the guest. Use <code>bin</code> mode for kits and other binaries.' },
		{ cmd: 'echo "info status" | socat - UNIX-CONNECT:monitor.sock', desc: 'Is the VM running or paused?' },
		{ cmd: 'echo "screendump /tmp/vga.png -f png" | socat - UNIX-CONNECT:monitor.sock && open /tmp/vga.png', desc: 'Screenshot the VM display.' },
		{ cmd: 'echo "savevm vms-clean" | socat - UNIX-CONNECT:monitor.sock', desc: 'Save a snapshot (step 10).' },
		{ cmd: 'socat -,raw,echo=0,escape=0x1d UNIX-CONNECT:console.sock', desc: 'Attach to the serial console, if you added one (see the tip in step 7). <kbd>Ctrl-]</kbd> detaches.' }
	];
	let copied = $state(-1);
	/** @param {number} i @param {Event} e */
	async function copyDaily(i, e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget).querySelector('code') ?? undefined;
		if (await copyText(daily[i].cmd, el)) {
			copied = i;
			setTimeout(() => copied === i && (copied = -1), 1200);
		}
	}
</script>

<Seo title="Run OpenVMS on an Apple Silicon Mac" description="Step-by-step: OpenVMS 9.2-3 x86-64 on an Apple Silicon Mac with a patched QEMU in TCG mode, based on astr0baby's guide." />

<Banner eyebrow="OpenVMS x86-64 V9.2-3 · QEMU TCG · macOS arm64" title="Run OpenVMS on an Apple Silicon Mac">
	Apple Silicon can't virtualize x86, so QEMU emulates the whole CPU in software (TCG). Out of the box OpenVMS hangs or
	crashes under that emulation; two small QEMU patches and a careful set of options make it boot and stay up. These are the
	steps, start to finish. On an Intel or AMD machine, <a href={resolve('/pc')}>Run It on a PC</a> is much simpler.
</Banner>

<aside class="credit" aria-label="Credit">
	<p>
		<strong>Credit:</strong> this walkthrough is based on
		<a href={GUIDE} target="_blank" rel="noopener">“Running OpenVMS 9.2-3 (x86_64) on macOS arm64 with QEMU TCG”</a>
		by <strong>astr0baby</strong>, who worked out the patches, the QEMU options and the boot sequence. All of the hard work is
		theirs. Go read the original; it's the source of truth, and it ships the patch files and helper scripts.
	</p>
	<p>
		The wording here is new. Boxes marked <em>Tip</em> are additions, not part of the original guide: alternatives and
		fixes for problems you may run into.
	</p>
</aside>

<section id="quickstart">
	<h2>Quickstart Script</h2>
	<p class="intro">
		One script does steps 1 to 7 for you: it installs the build tools with Homebrew, builds the patched QEMU, signs it, converts
		the Community License disk and writes the boot script. First register for the
		<a href="https://vmssoftware.com/community/community-license/" target="_blank" rel="noopener">Community License</a> and
		download the RAR, then run:
	</p>
	<CodeBlock code={`curl -fsSL ${script} | bash -s -- --image ~/Downloads/community_2026.rar`} />
	<p>Prefer to read a script before running it? Download it first:</p>
	<CodeBlock code={`curl -fsSLO ${script}
less mac.sh
bash mac.sh --image ~/Downloads/community_2026.rar`} />
	<ul class="points">
		<li><strong>What it needs:</strong> <a href="https://brew.sh" target="_blank" rel="noopener">Homebrew</a>, the Xcode command line tools (<code>xcode-select --install</code>), a few GB of free disk and 10 to 20 minutes, mostly building QEMU.</li>
		<li><strong>Where things go:</strong> QEMU in <code>~/.local/qemu</code>, the VM in <code>~/openvms</code>. Change them with <code>--prefix</code> and <code>--vm-dir</code>; <code>--help</code> lists every option.</li>
		<li><strong>What it won't do:</strong> it never uses <code>sudo</code>, and it never overwrites an existing disk image, UEFI variable store or <code>boot-vms.sh</code>. Run it again any time; finished steps are skipped.</li>
		<li><strong>The patches</strong> are downloaded from astr0baby's guide and checked against known checksums, and QEMU is built from the exact commit the guide was tested on.</li>
	</ul>
	<p>When it finishes, carry on from <a href="#boot">step 8, First Boot</a>. The steps below are the same process by hand.</p>
</section>

<nav class="toc" aria-label="Steps">
	<a href="#quickstart">Quickstart Script</a>
	{#each steps as [id, label], i (id)}<a href="#{id}">{i + 1}. {label}</a>{/each}
	<a href="#daily">Day-to-Day Commands</a>
	<a href="#perf">Performance</a>
</nav>

<ol class="steps">
	<li class="step" id="sdl">
		<h2>Build SDL2</h2>
		<p>QEMU uses SDL for its display window. The guide builds SDL2 2.30.10 from source into <code>/usr/local</code>:</p>
		<CodeBlock
			code={`curl -LO https://github.com/libsdl-org/SDL/releases/download/release-2.30.10/SDL2-2.30.10.tar.gz
tar xf SDL2-2.30.10.tar.gz
cd SDL2-2.30.10
./configure --prefix=/usr/local
make -j$(sysctl -n hw.ncpu)
sudo make install
cd ..`}
		/>
		<div class="mine">
			<p><strong>Tip:</strong> Homebrew works too: <code>brew install sdl2</code>. QEMU's configure finds it through pkg-config just the same.</p>
		</div>
	</li>

	<li class="step" id="socat">
		<h2>Build socat</h2>
		<p>
			socat lets you talk to the QEMU monitor over its Unix socket. The guide calls it optional, but you need it for the snapshot
			step. It builds the same way as SDL2, from
			<code>socat-1.8.0.2.tar.gz</code> at dest-unreach.org, with <code>--prefix=/usr/local</code>.
		</p>
		<p>Or install it with Homebrew:</p>
		<CodeBlock code="brew install socat" />
	</li>

	<li class="step" id="patch">
		<h2>Clone and Patch QEMU</h2>
		<p>Clone upstream QEMU with its submodules and apply astr0baby's two patches (download them from the guide first):</p>
		<CodeBlock
			code={`git clone https://gitlab.com/qemu-project/qemu.git
cd qemu
git submodule update --init --recursive
curl -LO ${PATCH1}
curl -LO ${PATCH2}
git apply 01-lapic-timer-fix.patch
git apply 02-max-insns-per-tb.patch`}
		/>
		<ul>
			<li>
				<a href={PATCH1} target="_blank" rel="noopener"><code>01-lapic-timer-fix.patch</code></a> changes QEMU's local APIC
				(<code>hw/intc/apic.c</code>). VMS masks the timer interrupt, programs the timer, then unmasks it. Stock QEMU drops a
				timer interrupt that fires while it's masked, so VMS waits forever during boot. The patch remembers the pending
				interrupt and delivers it on unmask.
			</li>
			<li>
				<a href={PATCH2} target="_blank" rel="noopener"><code>02-max-insns-per-tb.patch</code></a> adds a
				<code>max-insns-per-tb</code> option to the TCG accelerator that caps how many guest instructions go into each
				translated block. Setting it to 1 avoids the <code>%RMS-F-BUG</code> crashes that otherwise hit under heavy file I/O
				(compiles, TCP/IP startup, shutdown), while keeping block chaining so it's faster than <code>one-insn-per-tb</code>.
			</li>
		</ul>
		<p>The guide was tested against QEMU commit <code>e9fa1f6</code> on the staging branch (November 2026). If a patch doesn't apply on a newer tree, check out that commit.</p>
	</li>

	<li class="step" id="build">
		<h2>Configure and Build QEMU</h2>
		<p>Build only the x86-64 system emulator, with SDL and without the extras. On Apple Silicon it takes a few minutes.</p>
		<CodeBlock
			code={`mkdir -p build && cd build
../configure \\
  --target-list=x86_64-softmmu \\
  --enable-tcg \\
  --enable-sdl \\
  --disable-werror \\
  --disable-docs \\
  --disable-gtk \\
  --disable-cocoa \\
  --disable-vnc \\
  --disable-spice-protocol \\
  --disable-usb-redir \\
  --disable-libusb \\
  --disable-brlapi \\
  --prefix=/usr/local
make -j$(sysctl -n hw.ncpu)`}
		/>
		<div class="mine">
			<p><strong>Tip:</strong> no admin rights, or an old libfuse in <code>/usr/local/lib</code> getting linked in? Add <code>--disable-fuse</code>, install into your home directory instead, and confirm fuse isn't linked:</p>
			<CodeBlock
				code={`../configure <same flags as above> --disable-fuse --prefix=$HOME/.local/qemu
make -j$(sysctl -n hw.ncpu) && make install
otool -L qemu-system-x86_64 | grep -i fuse   # should print nothing`}
			/>
			<p><code>make install</code> also puts the UEFI firmware in <code>~/.local/qemu/share/qemu</code>, which the boot script needs.</p>
		</div>
	</li>

	<li class="step" id="sign">
		<h2>Copy and Sign the Binaries</h2>
		<p>Put everything in one working folder. macOS kills an unsigned copy of the binary on launch (exit code 137), so clear the quarantine attributes and ad-hoc sign both tools:</p>
		<CodeBlock
			code={`mkdir -p ~/openvms && cd ~/openvms
cp /path/to/qemu/build/qemu-system-x86_64 .
cp /path/to/qemu/build/qemu-img .
xattr -cr qemu-system-x86_64 qemu-img
codesign -f -s - qemu-system-x86_64
codesign -f -s - qemu-img`}
		/>
	</li>

	<li class="step" id="image">
		<h2>Get and Convert the OpenVMS Image</h2>
		<p>
			Register for the free OpenVMS Community License at
			<a href="https://vmssoftware.com/" target="_blank" rel="noopener">VMS Software (VSI)</a>. You'll get a RAR of about
			1.3&nbsp;GB, named like <code>community_2026.rar</code>, containing a prebuilt VMware disk. Unpack it, then convert the
			disk to qcow2. Point <code>qemu-img</code> at the small descriptor <code>.vmdk</code>, not the large data file next to
			it (<code>X86_V923-comm-2026-flat.vmdk</code> in the 2026 kit; some kits split it into <code>-s001</code>,
			<code>-s002</code>… files instead).
		</p>
		<CodeBlock
			code={`unrar x community_2026.rar
./qemu-img convert -f vmdk -O qcow2 \\
  community_2026/X86_V923-comm-2026.vmdk openvms-vanilla.qcow2
./qemu-img create -f qcow2 \\
  -b openvms-vanilla.qcow2 -F qcow2 openvms-run.qcow2
./qemu-img convert -f raw -O qcow2 \\
  /usr/local/share/qemu/edk2-i386-vars.fd OVMF_VARS.qcow2`}
		/>
		<ul>
			<li><code>openvms-vanilla.qcow2</code> (about 4&nbsp;GB) is the pristine base disk.</li>
			<li><code>openvms-run.qcow2</code> is a copy-on-write overlay. The VM writes here, so you can always start over from the base.</li>
			<li><code>OVMF_VARS.qcow2</code> is a writable UEFI variable store. It's qcow2 so it can be included in snapshots. (QEMU ships one vars template, <code>edk2-i386-vars.fd</code>, for both 32- and 64-bit firmware.)</li>
		</ul>
		<p>Once the conversion is done you can delete the RAR and the extracted folder.</p>
		<div class="mine">
			<p><strong>Tip:</strong> macOS has no <code>unrar</code>. <code>brew install sevenzip</code> then <code>7zz x community_2026.rar</code> does the same job. With a home-directory install (step 4), the vars template is at <code>~/.local/qemu/share/qemu/edk2-i386-vars.fd</code>.</p>
		</div>
	</li>

	<li class="step" id="script">
		<h2>Write the Boot Script</h2>
		<p>Save this as <code>~/openvms/boot-vms.sh</code> and <code>chmod +x</code> it.</p>
		<CodeBlock
			lang="bash"
			code={`#!/bin/bash
BASEDIR="$(cd "$(dirname "$0")" && pwd)"
QEMU="$BASEDIR/qemu-system-x86_64"
FIRMWARE=/usr/local/share/qemu
export DYLD_LIBRARY_PATH=/usr/local/lib

exec "$QEMU" \\
  -machine q35,hpet=off \\
  -accel tcg,thread=single,max-insns-per-tb=1 \\
  -cpu max \\
  -m 4096 \\
  -smp 1 \\
  -icount shift=auto,align=off \\
  -rtc base=utc,clock=vm \\
  -nodefaults \\
  -device VGA,vgamem_mb=8 \\
  -drive if=pflash,format=raw,readonly=on,file="$FIRMWARE/edk2-x86_64-code.fd" \\
  -drive if=pflash,format=qcow2,file="$BASEDIR/OVMF_VARS.qcow2" \\
  -drive file="$BASEDIR/openvms-run.qcow2",format=qcow2,if=none,id=disk0 \\
  -device ahci,id=ahci0 \\
  -device ide-hd,drive=disk0,bus=ahci0.0 \\
  -monitor unix:"$BASEDIR/monitor.sock",server,nowait \\
  -display sdl \\
  -no-reboot \\
  -netdev user,id=net0,net=10.0.2.0/24,dhcpstart=10.0.2.15,hostfwd=tcp::2222-:22,hostfwd=tcp::2223-:23,hostfwd=tcp::2221-:21 \\
  -device e1000e,netdev=net0`}
		/>
		<p>What the important options do:</p>
		<ul>
			<li><code>-accel tcg,thread=single,max-insns-per-tb=1</code>: software emulation on one host thread, with patch 2's block-size cap.</li>
			<li><code>-cpu max</code>: VMS needs at least SSE4.1 and XSAVE, which the default CPU model lacks.</li>
			<li><code>-icount shift=auto,align=off</code>: ties guest time to instructions executed. Without it, UEFI's timed delays can take hours under emulation.</li>
			<li><code>-machine q35,hpet=off</code>, <code>-smp 1</code>, <code>-m 4096</code>: a modern chipset without the HPET, one CPU, 4&nbsp;GB of RAM.</li>
			<li>Two <code>pflash</code> drives: the read-only UEFI code and your writable variable store.</li>
			<li>The disk on an AHCI controller, the QEMU monitor on <code>monitor.sock</code>, and an e1000e NIC behind user-mode NAT.</li>
			<li><code>hostfwd</code>: Mac ports 2222, 2223 and 2221 reach the guest's SSH, Telnet and FTP.</li>
		</ul>
		<div class="mine">
			<p><strong>Tip:</strong> if you installed QEMU under <code>~/.local/qemu</code>, set <code>FIRMWARE="$HOME/.local/qemu/share/qemu"</code> and add <code>-L "$FIRMWARE"</code> so QEMU also finds its VGA BIOS and option ROMs there.</p>
			<p>A serial console on a socket, logged to a file, is handy for watching boot from a terminal. Add these lines before <code>-display sdl</code>:</p>
			<CodeBlock
				code={`  -chardev socket,id=con0,path="$BASEDIR/console.sock",server=on,wait=off,logfile="$BASEDIR/console.log" \\
  -serial chardev:con0 \\`}
			/>
			<p>Don't swap <code>-display sdl</code> for <code>-display none</code>: without a display, VMS can hang right after <code>%GCDRIVER-I-INITDRV</code>.</p>
		</div>
	</li>

	<li class="step" id="boot">
		<h2>First Boot</h2>
		<ol>
			<li>Run <code>./boot-vms.sh</code>. The SDL window opens and UEFI takes about a minute to reach the VSI Boot Manager.</li>
			<li>At the <code>BOOTMGR&gt;</code> prompt, type <code>OPA0</code>, then <code>BOOT</code>.</li>
			<li>Watch VMS come up in the window. The first boot is the slowest; expect 5 to 10 minutes to the login prompt.</li>
			<li>Log in as <code>SYSTEM</code>.</li>
		</ol>
		<p>The <a href={resolve('/')}>cheat sheet</a> covers setting the SYSTEM password, finding your way around DCL, and shutting down cleanly.</p>
	</li>

	<li class="step" id="trim">
		<h2>Trim Startup Services</h2>
		<p>The Community image starts Apache, Samba and Tomcat, which are slow under emulation. The guide provides <code>disable-services.com</code> to turn them off, or you can do it by hand at the <code>$</code> prompt:</p>
		<CodeBlock
			lang="dcl"
			code={`$ @SYS$STARTUP:SAMBA$SHUTDOWN.COM
$ RENAME SYS$STARTUP:APACHE$STARTUP.COM SYS$STARTUP:APACHE$STARTUP.COM_DISABLED
$ RENAME SYS$STARTUP:SAMBA$STARTUP.COM SYS$STARTUP:SAMBA$STARTUP.COM_DISABLED
$ RENAME SYS$COMMON:[SYSMGR]TOMCAT$DEFINE_LOGICALS.COM -
         SYS$COMMON:[SYSMGR]TOMCAT$DEFINE_LOGICALS.COM_DISABLED`}
		/>
		<p>Optionally, stop the SYSTEM password from expiring:</p>
		<CodeBlock lang="dcl" code="$ MC AUTHORIZE MODIFY SYSTEM /PWDLIFETIME=NONE" />
	</li>

	<li class="step" id="snapshot">
		<h2>Save a Snapshot</h2>
		<p>Once VMS is booted and tidy, save the running state from the Mac. Restoring it skips the whole boot.</p>
		<CodeBlock code={`echo "savevm vms-clean" | socat - UNIX-CONNECT:monitor.sock`} />
		<p>To restore, add <code>-loadvm vms-clean</code> to the <code>exec</code> line of <code>boot-vms.sh</code>.</p>
	</li>

	<li class="step" id="connect">
		<h2>Connect over SSH, Telnet or FTP</h2>
		<p>The port forwards make the guest reachable on localhost. VMS's SSH server is slow to complete the handshake under emulation, so allow a long timeout:</p>
		<CodeBlock code={`ssh -p 2222 -o ConnectTimeout=120 -o ServerAliveInterval=30 system@127.0.0.1`} />
		<div class="mine">
			<p><strong>Tip:</strong> OpenSSH comes preinstalled on the Community image. If <code>ssh</code> is refused, start the server inside VMS with <code>@SYS$STARTUP:SSH$STARTUP</code> and check that <code>TCPIP SHOW SERVICE</code> lists <code>SSHD22</code> as enabled. Telnet is on <code>telnet 127.0.0.1 2223</code> and FTP on <code>ftp -P 2221 127.0.0.1</code>.</p>
		</div>
	</li>
</ol>

<section id="daily">
	<h2>Day-to-Day Commands</h2>
	<p class="intro">Run these on the Mac, from the folder that holds <code>boot-vms.sh</code>. Click a command to copy it.</p>
	<div class="tbl">
		<table>
			<thead><tr><th>Command</th><th>What it does</th></tr></thead>
			<tbody>
				{#each daily as d, i (d.cmd)}
					<tr class:copied={copied === i}>
						<td class="cmd" tabindex="0" title="Copy" onclick={(e) => copyDaily(i, e)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyDaily(i, e); } }}><code>{@html highlight(d.cmd, 'shell')}</code></td>
						<td>{@html d.desc}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="callout"><strong>Shut down from inside VMS:</strong> run <code>@SYS$SYSTEM:SHUTDOWN</code> before closing QEMU. Sending <code>quit</code> to the monitor, or closing the window, is the same as pulling the power.</p>
</section>

<section id="perf">
	<h2>Performance</h2>
	<p class="intro">astr0baby's numbers on a MacBook Air M2 (8 GB), with one emulated CPU and the services above disabled:</p>
	<div class="tbl perf">
		<table>
			<thead><tr><th>Measure</th><th>Result</th></tr></thead>
			<tbody>
				<tr><td>Cold boot to login</td><td>2 min 40 s</td></tr>
				<tr><td>Restore from snapshot</td><td>under 1 s</td></tr>
				<tr><td>C compile and link</td><td>about 5 s</td></tr>
				<tr><td>Shutdown</td><td>about 30 s</td></tr>
				<tr><td>Dhrystone 2.1</td><td>95.1 VUPs</td></tr>
			</tbody>
		</table>
	</div>
	<p>Integer work is usable for interactive development. Floating point and string operations are much slower, because TCG has to emulate SSE and repeated string instructions one at a time on arm64.</p>
</section>

<footer>
	Original guide, patches and scripts: <a href={GUIDE} target="_blank" rel="noopener">astr0baby.online/OpenVMS/QEMU_TCG</a>.
	OpenVMS and the Community License are from <a href="https://vmssoftware.com/" target="_blank" rel="noopener">VMS Software, Inc.</a>
	<p class="tm">OpenVMS and the OpenVMS logo are trademarks of VMS Software, Inc. This is an unofficial fan reference.</p>
</footer>
