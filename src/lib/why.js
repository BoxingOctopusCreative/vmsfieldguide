// Content for the "Why VMS?" page. Text fields may contain inline HTML (<code>).
// Keep claims conservative and dated; see the constitution's accuracy principle.

/** @typedef {{ title: string, vms: string, linux: string }} Edge */

/** Where VMS's design still has an edge. `linux` is the honest "what Linux has today". */
export const edges = /** @type {Edge[]} */ ([
	{
		title: 'Clustering Built into the OS',
		vms: 'Clusters have been part of VMS since the VAXcluster in 1983. Up to 96 nodes share the same disks and files, coordinated by a distributed lock manager in the operating system itself. Nodes can sit at separate sites, and you can upgrade the OS one node at a time while applications keep running.',
		linux: 'Pacemaker, Corosync, GFS2 or OCFS2 and DRBD can build something similar, but they are separate projects assembled and tested together by you or your vendor.'
	},
	{
		title: 'Upward Compatibility',
		vms: 'OpenVMS has a long-standing policy that programs and command procedures written for an earlier version keep working on later ones. DCL scripts from decades ago often run unchanged. Moving between hardware architectures (VAX, Alpha, Itanium, x86-64) generally means recompiling, not rewriting.',
		linux: 'The kernel keeps its user-space interface stable, but libraries, init systems and distributions change underneath applications far more often.'
	},
	{
		title: 'File Versions for Free',
		vms: 'Every save keeps the previous copy as a new version (<code>;1</code>, <code>;2</code>…), in every program, with nothing to set up. <code>PURGE</code> tidies them away.',
		linux: 'ZFS and Btrfs snapshots or a version control system cover the same need, but they have to be set up and work at a different level.'
	},
	{
		title: 'Structured Files in the OS',
		vms: 'The Record Management Services (RMS) give every program sequential, relative and indexed (keyed) files with record locking, as a standard part of the system.',
		linux: 'A file is a stream of bytes; anything structured comes from a library or a database.'
	},
	{
		title: 'One Consistent Command Language',
		vms: 'Every DCL command follows the same verb and <code>/QUALIFIER</code> grammar, accepts any unique abbreviation, and is documented in the built-in <code>HELP</code>.',
		linux: 'Each tool has its own option syntax, and GNU, BSD and macOS versions of the same tool often differ.'
	},
	{
		title: 'Security Designed In Early',
		vms: 'Fine-grained privileges instead of a single all-powerful root, access control lists, per-user quotas and security auditing were part of VMS early on, and it was evaluated at the US C2 security level.',
		linux: 'Capabilities, SELinux or AppArmor, cgroups and auditd now provide comparable controls, added over many years and configured separately.'
	},
	{
		title: 'Asynchronous I/O from the Start',
		vms: 'The <code>$QIO</code> system service and asynchronous system traps (ASTs) made non-blocking I/O the normal way to write system software from the first release.',
		linux: 'A general-purpose asynchronous I/O interface, io_uring, arrived in 2019 (kernel 5.1).'
	},
	{
		title: 'Batch and Print Queues Included',
		vms: 'Job queues with scheduling, priorities, retries and per-queue limits are built in: <code>SUBMIT</code>, <code>SHOW QUEUE</code>, <code>SHOW ENTRY</code>.',
		linux: 'cron, systemd timers, at and CUPS each cover part of it; a full batch system is a separate product.'
	}
]);

/** Where Linux is the better choice. */
export const linuxWins = [
	'<strong>Single-machine features have caught up.</strong> Snapshots, capabilities, mandatory access control, resource limits and fast asynchronous I/O all exist on Linux now, and are often faster.',
	'<strong>Ecosystem.</strong> Software, drivers, cloud images, containers, documentation and people who know it are vastly more plentiful.',
	'<strong>Hardware and platforms.</strong> Linux runs on nearly everything; OpenVMS x86-64 runs on a limited set of supported hypervisors and servers.',
	'<strong>Cost and vendors.</strong> Linux is free with many vendors to choose from; OpenVMS is commercial and comes from one company, VMS Software, Inc.',
	'<strong>Modern workloads.</strong> For web services, data processing and machine learning, Linux is faster to build on and scales out further.'
];

/** Kinds of systems where VMS is still common. Kept general on purpose. */
export const stillRuns = [
	'Banking, payments and stock exchanges',
	'Rail and transport control systems',
	'Manufacturing and process control',
	'Healthcare and government records',
	'Telecommunications'
];
