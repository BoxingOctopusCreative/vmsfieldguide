<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import CodeBlock from '#lib/CodeBlock.svelte';
	import Callout from '#lib/Callout.svelte';
	import SectionLinks from '#lib/SectionLinks.svelte';
	import { Card } from 'flowbite-svelte';
	import { Server, Box, Cloud, Cpu } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	const INSTALL = 'https://docs.vmssoftware.com/vsi-openvms-x86-64-v923-installation-guide/';
	const NOTES = 'https://docs.vmssoftware.com/vsi-openvms-x86-64-v923-release-notes/';
	const COMMUNITY = 'https://vmssoftware.com/community/community-license/';

	const steps = [
		['check', 'Check Your CPU'],
		['packages', 'Install KVM and libvirt'],
		['disk', 'Unpack and Convert the Disk'],
		['create', 'Create the VM'],
		['boot', 'First Boot'],
		['network', 'Set Up Networking'],
		['snapshot', 'Save a Snapshot']
	];
</script>

<Seo
	title="Run OpenVMS on an x86 PC"
	description="Run OpenVMS x86-64 V9.2-3 on an ordinary PC: under KVM on Linux, in VirtualBox or VMware, and what to expect from bare metal."
/>

<Banner eyebrow="OpenVMS x86-64 V9.2-3 · KVM · VirtualBox · VMware" title="Run OpenVMS on an x86 PC">
	On an Intel or AMD machine, OpenVMS runs in a virtual machine at close to native speed, with no patches needed. This page
	covers KVM on Linux step by step, the settings for VirtualBox and VMware, and the honest story on bare metal. On an Apple
	Silicon Mac, use <a href={resolve('/qemu')}>Run It on a Mac</a> instead.
</Banner>

<Callout kind="info">
	<p>
		<strong>Sources:</strong> requirements and settings come from VMS Software's
		<a href={INSTALL} target="_blank" rel="noopener">V9.2-3 Installation Guide</a> and
		<a href={NOTES} target="_blank" rel="noopener">Release Notes</a>. Those are the authority; if anything here disagrees
		with them, they win. Boxes marked <em>Tip</em> are practical notes, not VSI requirements.
	</p>
</Callout>

<SectionLinks links={[['routes', 'Choose Your Route'], ['need', 'What You Need'], ...steps.map(([id, label], i) => /** @type {[string, string]} */ ([id, `${i + 1}. ${label}`])), ['virtualbox', 'VirtualBox'], ['vmware', 'VMware'], ['metal', 'Bare Metal']]} />

<section id="routes">
	<h2>Choose Your Route</h2>
	<div class="notes">
		<Card class="gap-2"><h3 class="flex items-center gap-2"><Server size={18} class="shrink-0 text-accent" aria-hidden="true" />KVM on Linux</h3><p class="text-sm text-muted">The best fit for a spare PC: install Linux on it, then run VMS as a guest. Free, fast, and one of VSI's tested platforms. Covered step by step below.</p></Card>
		<Card class="gap-2"><h3 class="flex items-center gap-2"><Box size={18} class="shrink-0 text-accent" aria-hidden="true" />VirtualBox</h3><p class="text-sm text-muted">Easiest on a Windows or Linux desktop you already use. Free, and it can use the Community disk as it comes.</p></Card>
		<Card class="gap-2"><h3 class="flex items-center gap-2"><Cloud size={18} class="shrink-0 text-accent" aria-hidden="true" />VMware</h3><p class="text-sm text-muted">Workstation Pro on Windows or Linux, or ESXi on a server. The Community disk is already in VMware format.</p></Card>
		<Card class="gap-2"><h3 class="flex items-center gap-2"><Cpu size={18} class="shrink-0 text-accent" aria-hidden="true" />Bare Metal</h3><p class="text-sm text-muted">Officially only on specific HPE servers. On an old PC it almost certainly won't work; see <a href="#metal">Bare Metal</a> for why.</p></Card>
	</div>
</section>

<section id="need">
	<h2>What You Need</h2>
	<ul class="ms-5 grid max-w-[75ch] list-disc gap-2">
		<li><strong>A recent enough CPU.</strong> VMS checks for SSE4.1, XSAVE, NX, a TSC and hardware virtualization (VT-x or AMD-V) and won't boot without them. VSI says most Intel CPUs from 2016 and AMD Zen CPUs from 2017 onwards qualify.</li>
		<li><strong>Resources for the guest:</strong> 8&nbsp;GB of memory and 2 CPUs are VSI's recommended settings, plus 15&nbsp;GB or more of disk.</li>
		<li><strong>UEFI firmware in the VM.</strong> Legacy BIOS isn't supported, and Secure Boot must be off.</li>
		<li>
			<strong>The OpenVMS Community License</strong>, free for non-commercial use from
			<a href={COMMUNITY} target="_blank" rel="noopener">VMS Software</a>. It comes as a RAR of about 1.3&nbsp;GB, named
			like <code>community_2026.rar</code>, holding a ready-installed VMware disk. The license runs for 12 months.
		</li>
	</ul>
</section>

<ol class="steps">
	<li class="step" id="check">
		<h2>Check Your CPU</h2>
		<p>On the Linux host, list the features VMS needs. You want to see all of <code>nx</code>, <code>sse4_1</code>, <code>xsave</code> and <code>tsc</code>, plus <code>vmx</code> (Intel) or <code>svm</code> (AMD):</p>
		<CodeBlock code={`grep -owE 'nx|sse4_1|xsave|tsc|vmx|svm' /proc/cpuinfo | sort -u`} />
		<p>If <code>vmx</code> or <code>svm</code> is missing, turn on virtualization (VT-x, AMD-V or SVM) in the PC's firmware setup. VSI also publishes a checker script, <code>vmscheck.py</code>, linked from the Release Notes.</p>
	</li>

	<li class="step" id="packages">
		<h2>Install KVM and libvirt</h2>
		<p>On Debian or Ubuntu:</p>
		<CodeBlock code={`sudo apt install qemu-system-x86 qemu-utils libvirt-daemon-system virtinst ovmf unar
sudo usermod -aG libvirt,kvm "$USER"   # then log out and back in`} />
		<p>On Fedora, Rocky or RHEL:</p>
		<CodeBlock code={`sudo dnf install qemu-kvm qemu-img libvirt virt-install edk2-ovmf unar
sudo systemctl enable --now libvirtd`} />
		<p>VSI tests on Rocky Linux 9.4, RHEL 9.4 and Ubuntu 22.04. Use QEMU 6.2 or later if you want virtio-scsi disks.</p>
	</li>

	<li class="step" id="disk">
		<h2>Unpack and Convert the Disk</h2>
		<p>Unpack the Community kit, then convert its VMware disk to qcow2. Point <code>qemu-img</code> at the small descriptor <code>.vmdk</code>, not the large data file next to it (<code>-flat.vmdk</code> in the 2026 kit, or <code>-s001</code>, <code>-s002</code>… in split kits). Your file names may differ.</p>
		<CodeBlock code={`unar community_2026.rar
qemu-img convert -p -f vmdk -O qcow2 -o preallocation=full \\
  community_2026/X86_V923-comm-2026.vmdk openvms.qcow2
sudo mv openvms.qcow2 /var/lib/libvirt/images/`} />
		<Callout title="Tip"><p>VSI doesn't support thin-provisioned disks on any hypervisor, which is why the command fully allocates the image with <code>preallocation=full</code>. The file takes up the disk's whole size, but writes behave the way VMS expects.</p></Callout>
	</li>

	<li class="step" id="create">
		<h2>Create the VM</h2>
		<p>This follows VSI's KVM settings: Q35 chipset, UEFI with Secure Boot off, a SATA disk with write-through caching, an e1000e network card and a serial console.</p>
		<CodeBlock code={`sudo virt-install \\
  --name openvms \\
  --memory 8192 --vcpus 2 \\
  --cpu host-passthrough \\
  --machine q35 \\
  --boot uefi,firmware.feature0.name=secure-boot,firmware.feature0.enabled=no \\
  --disk path=/var/lib/libvirt/images/openvms.qcow2,bus=sata,cache=writethrough \\
  --network network=default,model=e1000e \\
  --serial pty \\
  --graphics vnc \\
  --os-variant generic \\
  --import --noautoconsole`} />
		<Callout title="Tip"><p><code>--cpu host-passthrough</code> hands your real CPU's features to the guest, so VMS's CPU check sees XSAVE and SSE4.1. On older virt-install versions without the <code>firmware.feature</code> syntax, use <code>--boot loader=/usr/share/OVMF/OVMF_CODE.fd,loader.readonly=yes,loader.type=pflash</code> (the path varies by distribution). If you prefer a GUI, virt-manager can make the same VM; pick <em>Customize before install</em> to set the chipset, firmware and disk bus.</p></Callout>
	</li>

	<li class="step" id="boot">
		<h2>First Boot</h2>
		<ol>
			<li>Attach to the serial console with <code>sudo virsh console openvms</code>, or open the VM's display in virt-manager.</li>
			<li>Wait for the VSI Boot Manager's <code>BOOTMGR&gt;</code> prompt. If you land in the UEFI Shell instead, run <code>map fs*</code> to find the disk, then <code>FS0:\efi\vms\vms_bootmgr</code>.</li>
			<li>To use the VM's own screen and keyboard, type <code>OPA0</code> to turn on the Guest Console. To stay on the serial console, skip it.</li>
			<li>Type <code>DEVICES</code> to list bootable disks, then <code>BOOT</code> followed by the system disk's name.</li>
			<li>Log in as <code>SYSTEM</code> once VMS reaches the login prompt.</li>
		</ol>
		<p>From here, the Mac guide's <a href="{resolve('/qemu')}#trim">Trim Startup Services</a> step applies unchanged and is worth doing, and the <a href={resolve('/')}>cheat sheet</a> covers passwords, finding your way around DCL and shutting down cleanly.</p>
	</li>

	<li class="step" id="network">
		<h2>Set Up Networking</h2>
		<p>The VM sits on libvirt's default NAT network (<code>192.168.122.0/24</code>). Inside VMS, run the TCP/IP configuration menu, set the interface up with DHCP or a static address in that range, and enable the SSH server:</p>
		<CodeBlock lang="dcl" code="$ @SYS$MANAGER:TCPIP$CONFIG" />
		<p>Then, from the Linux host:</p>
		<CodeBlock code={`sudo virsh domifaddr openvms   # if VMS took a DHCP address
ssh system@192.168.122.50       # use the VM's address`} />
		<Callout title="Tip"><p>VSI also supports a paravirtual virtio network card on KVM, which can be faster than e1000e once the system is set up. The Community image may already have TCP/IP configured; check with <code>TCPIP SHOW INTERFACE</code> before changing anything.</p></Callout>
	</li>

	<li class="step" id="snapshot">
		<h2>Save a Snapshot</h2>
		<p>Once VMS is set up the way you like, shut it down from inside VMS, then snapshot the disk so you can always get back to a clean system:</p>
		<CodeBlock lang="dcl" code="$ @SYS$SYSTEM:SHUTDOWN" />
		<CodeBlock code={`sudo qemu-img snapshot -c clean /var/lib/libvirt/images/openvms.qcow2   # save
sudo qemu-img snapshot -a clean /var/lib/libvirt/images/openvms.qcow2   # roll back`} />
		<Callout title="Tip"><p>libvirt can't take live snapshots of UEFI VMs on many versions, so snapshot the disk with the VM shut down, as above.</p></Callout>
	</li>
</ol>

<section id="virtualbox">
	<h2>VirtualBox</h2>
	<p>VSI tests with VirtualBox 7. Create a new VM and set:</p>
	<ul class="ms-5 grid max-w-[75ch] list-disc gap-2">
		<li><strong>Type:</strong> Other, version Other/Unknown (64-bit).</li>
		<li><strong>System:</strong> 8&nbsp;GB memory, 2 CPUs, <em>Enable EFI</em> on, chipset <strong>ICH9</strong>. VSI says OpenVMS won't install with any other chipset.</li>
		<li><strong>Storage:</strong> attach the Community <code>.vmdk</code> to a SATA (AHCI) controller. IDE controllers aren't supported.</li>
		<li><strong>Network:</strong> an Intel PRO/1000 adapter (82540EM, 82543GC or 82545EM).</li>
		<li><strong>Serial port (optional):</strong> COM1 only, as a TCP socket you can <code>telnet</code> to. Or use the Guest Console with <code>OPA0</code>.</li>
	</ul>
	<p>To give it a fully allocated disk, as VSI prefers, convert the VMDK first:</p>
	<CodeBlock code="VBoxManage clonemedium disk X86_V923-comm-2026.vmdk openvms.vdi --format VDI --variant Fixed" />
	<Callout title="Tip"><p>On Windows 10 or 11 with Hyper-V turned on (including WSL 2 and some security features), VirtualBox runs on top of Hyper-V and the guest can fail VMS's CPU check because XSAVE is hidden. VSI's Release Notes cover this.</p></Callout>
</section>

<section id="vmware">
	<h2>VMware</h2>
	<p>VSI tests ESXi 8.0, Workstation Pro 17 and Fusion Pro 13.5. Create a custom VM and set:</p>
	<ul class="ms-5 grid max-w-[75ch] list-disc gap-2">
		<li><strong>Guest OS:</strong> Other 64-bit. <strong>Firmware:</strong> UEFI, with Secure Boot off.</li>
		<li><strong>Resources:</strong> 8&nbsp;GB memory, 2 CPUs.</li>
		<li><strong>Disk:</strong> use the existing Community <code>.vmdk</code> on a SATA controller. LSI Logic Parallel SCSI also works; LSI Logic SAS doesn't.</li>
		<li><strong>Network:</strong> E1000e, or VMXNET 3 on ESXi.</li>
	</ul>
	<p>Workstation and Fusion don't offer a virtual serial port in their GUI, so use the Guest Console (<code>OPA0</code> at <code>BOOTMGR&gt;</code>).</p>
</section>

<section id="metal">
	<h2>Bare Metal</h2>
	<p>Installing straight onto a PC is the one route that is unlikely to work, for several reasons at once:</p>
	<ul class="ms-5 grid max-w-[75ch] list-disc gap-2">
		<li><strong>Supported hardware is narrow.</strong> At the x86-64 launch, VSI supported bare metal on a single HPE ProLiant server model, the DL380. Ordinary desktops and laptops are not on the list.</li>
		<li><strong>Drivers.</strong> VMS ships drivers for the hardware hypervisors present and a small set of server parts, not for a typical PC's network card, graphics or storage controller.</li>
		<li><strong>The CPU and firmware bar.</strong> An older PC has to meet the same 2016-or-later CPU features and pure UEFI boot as a VM, which rules out most of the machines people have lying around.</li>
		<li><strong>The Community kit is a pre-installed virtual disk</strong>, not an installer, so it isn't designed for physical hardware at all.</li>
	</ul>
	<p>The practical way to put that old PC to use is to install Linux on it and follow the KVM steps above. With hardware virtualization the guest runs at close to native speed, and you get snapshots and an easy way back if something breaks.</p>
</section>

<footer class="page-footer">
	Settings checked against VSI's V9.2-3 <a href={INSTALL} target="_blank" rel="noopener">Installation Guide</a> and
	<a href={NOTES} target="_blank" rel="noopener">Release Notes</a> in November 2026. Newer releases may change them.
	<p class="tm">OpenVMS and the OpenVMS logo are trademarks of VMS Software, Inc. This is an unofficial fan reference.</p>
</footer>
