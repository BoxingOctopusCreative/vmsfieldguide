#!/usr/bin/env bash
#
# OpenVMS Field Notes: Mac quickstart
# Builds a patched QEMU and sets up OpenVMS x86-64 V9.2-3 on an Apple Silicon Mac.
#
#   curl -fsSL <site>/install/mac.sh | bash -s -- --image ~/Downloads/community_2026.rar
#
# Or download it, read it, then run it:
#
#   curl -fsSLO <site>/install/mac.sh && less mac.sh && bash mac.sh --image ~/Downloads/community_2026.rar
#
# Based on astr0baby's guide, "Running OpenVMS 9.2-3 (x86_64) on macOS arm64 with QEMU TCG":
#   https://astr0baby.online/OpenVMS/QEMU_TCG/
# The QEMU patches are downloaded from that guide at run time and checked against known checksums.
#
# Safe to run more than once. It never uses sudo, and it never overwrites an existing disk image,
# UEFI variable store or boot script: existing files are left alone and reported.
#
# Unofficial. OpenVMS is a trademark of VMS Software, Inc.

set -euo pipefail

# ---------------------------------------------------------------- settings

QEMU_REPO="https://gitlab.com/qemu-project/qemu.git"
QEMU_COMMIT="e9fa1f66f0d47c74b6766e1b8b87ad7c2a9394d5" # tested with the patches below (Nov 2026)
PATCH_BASE="https://astr0baby.online/OpenVMS/QEMU_TCG"
PATCHES=(
	"01-lapic-timer-fix.patch 3eb58daa00b0b228a475e87158a6edd7b0f3523698ebce7debf7d5d5f6a5cc57"
	"02-max-insns-per-tb.patch d91853b15976a545634660d5d68fdcea957641c664acfa2fb2656e273005cee8"
)
BREW_DEPS=(glib pixman libslirp sdl2 meson ninja pkgconf socat unar)
# QEMU 11 no longer ships the UEFI variable store template (removed in commit 403337f1e6),
# so take it from the commit just before, and check it.
VARS_URL="https://gitlab.com/qemu-project/qemu/-/raw/1f03378bb49f0654598bdf6dced05f2502594c2d/pc-bios/edk2-i386-vars.fd.bz2"
VARS_SHA256="5d2ac383371b408398accee7ec27c8c09ea5b74a0de0ceea6513388b15be5d1e"

PREFIX="${OPENVMS_QEMU_PREFIX:-$HOME/.local/qemu}"
SRC_DIR="${OPENVMS_QEMU_SRC:-$HOME/.cache/openvms-field-notes/qemu}"
VM_DIR="${OPENVMS_VM_DIR:-$HOME/openvms}"
IMAGE=""
SKIP_BUILD=0
REBUILD=0

# ---------------------------------------------------------------- output

if [ -t 1 ]; then
	B=$'\033[1m' DIM=$'\033[2m' RED=$'\033[31m' GRN=$'\033[32m' YEL=$'\033[33m' BLU=$'\033[34m' R=$'\033[0m'
else
	B="" DIM="" RED="" GRN="" YEL="" BLU="" R=""
fi
step() { printf '\n%s==> %s%s\n' "$B$BLU" "$*" "$R"; }
info() { printf '    %s\n' "$*"; }
ok() { printf '    %s✓%s %s\n' "$GRN" "$R" "$*"; }
skip() { printf '    %s–%s %s\n' "$DIM" "$R" "$*"; }
warn() { printf '    %s!%s %s\n' "$YEL" "$R" "$*" >&2; }
die() {
	printf '\n%sError:%s %s\n' "$B$RED" "$R" "$*" >&2
	exit 1
}

usage() {
	cat <<EOF
OpenVMS Field Notes: Mac quickstart

Builds a patched QEMU and sets up OpenVMS x86-64 on an Apple Silicon Mac.

Usage: bash mac.sh [options]

Options:
  --image PATH    The OpenVMS Community License download: the .rar, the unpacked
                  folder, or its descriptor .vmdk. Without it, only QEMU is set up.
  --vm-dir DIR    Where the VM lives (default: ~/openvms)
  --prefix DIR    Where QEMU is installed (default: ~/.local/qemu)
  --src DIR       Where QEMU's source is cloned (default: ~/.cache/openvms-field-notes/qemu)
  --skip-build    Use the QEMU already in --prefix; don't build
  --rebuild       Build QEMU again even if a patched one is already installed
  -h, --help      Show this help

Environment variables OPENVMS_VM_DIR, OPENVMS_QEMU_PREFIX and OPENVMS_QEMU_SRC set the same defaults.

Nothing here needs sudo, and existing disk images, UEFI variables and boot scripts are never overwritten.
EOF
}

# ---------------------------------------------------------------- helpers

expand_path() { # expand a leading ~ in paths passed as arguments
	# Matching a literal "~" is the point here, so the tilde stays quoted.
	# shellcheck disable=SC2088
	case "$1" in
	"~") printf '%s\n' "$HOME" ;;
	"~/"*) printf '%s\n' "$HOME/${1#\~/}" ;;
	*) printf '%s\n' "$1" ;;
	esac
}

need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required. $2"; }

sha256() { shasum -a 256 "$1" | cut -d' ' -f1; }

ncpu() { sysctl -n hw.ncpu 2>/dev/null || echo 4; }

patched_qemu_installed() { # patch 2 adds the max-insns-per-tb option; look for its name in the binary
	[ -x "$PREFIX/bin/qemu-system-x86_64" ] &&
		LC_ALL=C grep -aq max-insns-per-tb "$PREFIX/bin/qemu-system-x86_64"
}

# ---------------------------------------------------------------- phases

preflight() {
	step "Checking this Mac"
	[ "$(uname -s)" = "Darwin" ] || die "this script is for macOS. On Linux, see the Run It on a PC guide."
	if [ "$(uname -m)" != "arm64" ]; then
		warn "This Mac isn't Apple Silicon. The script will still work, but an Intel Mac can run OpenVMS"
		warn "much faster with hardware virtualization; see the Run It on a PC guide for the settings."
	fi
	[ "$(id -u)" -ne 0 ] || die "don't run this as root or with sudo; it installs everything into your home directory."
	need curl ""
	need git "Install the Xcode command line tools: xcode-select --install"
	need codesign "Install the Xcode command line tools: xcode-select --install"
	xcode-select -p >/dev/null 2>&1 || die "the Xcode command line tools are missing. Run: xcode-select --install"
	need brew "Install Homebrew from https://brew.sh, then run this again."
	# QEMU's monitor and console sockets live in the VM folder; macOS limits socket paths to 104 bytes.
	local sock="$VM_DIR/console.sock"
	[ ${#sock} -lt 104 ] || die "the VM folder path is too long for QEMU's sockets ($((${#sock} - 13)) characters; keep it under 90). Use a shorter --vm-dir."
	ok "macOS $(sw_vers -productVersion 2>/dev/null || echo) on $(uname -m), with Homebrew and the command line tools"
	info "QEMU:   $PREFIX"
	info "VM:     $VM_DIR"
	[ -z "$IMAGE" ] || info "Image:  $IMAGE"
}

install_deps() {
	step "Installing build dependencies with Homebrew"
	local missing=() dep
	for dep in "${BREW_DEPS[@]}"; do
		brew list --formula "$dep" >/dev/null 2>&1 || missing+=("$dep")
	done
	if [ ${#missing[@]} -eq 0 ]; then
		skip "already installed: ${BREW_DEPS[*]}"
	else
		info "installing: ${missing[*]}"
		brew install "${missing[@]}"
		ok "done"
	fi
}

fetch_qemu() {
	step "Getting QEMU source (commit ${QEMU_COMMIT:0:10})"
	if [ ! -d "$SRC_DIR/.git" ]; then
		mkdir -p "$(dirname "$SRC_DIR")"
		info "cloning $QEMU_REPO (a large download; this can take a while)"
		# Blobs are fetched on demand, so only the tested commit's files are downloaded.
		git clone --filter=blob:none --no-checkout "$QEMU_REPO" "$SRC_DIR"
		git -C "$SRC_DIR" -c advice.detachedHead=false checkout "$QEMU_COMMIT"
	elif [ ! -f "$SRC_DIR/configure" ]; then
		# A clone from an interrupted earlier run, never checked out.
		git -C "$SRC_DIR" -c advice.detachedHead=false checkout -f "$QEMU_COMMIT"
	elif [ "$(git -C "$SRC_DIR" rev-parse HEAD 2>/dev/null)" != "$QEMU_COMMIT" ]; then
		if [ -n "$(git -C "$SRC_DIR" status --porcelain)" ]; then
			die "$SRC_DIR has local changes and isn't at the tested commit. Move it aside or pass --src to use another folder."
		fi
		git -C "$SRC_DIR" cat-file -e "$QEMU_COMMIT^{commit}" 2>/dev/null || git -C "$SRC_DIR" fetch origin
		git -C "$SRC_DIR" -c advice.detachedHead=false checkout "$QEMU_COMMIT"
	fi
	# QEMU's configure downloads the few subprojects it needs (meson wraps); the ROM submodules aren't needed.
	ok "source ready in $SRC_DIR"
}

apply_patches() {
	step "Applying astr0baby's patches"
	local dir="$SRC_DIR/.openvms-patches" entry name sum file
	mkdir -p "$dir"
	for entry in "${PATCHES[@]}"; do
		name="${entry% *}" sum="${entry#* }" file="$dir/$name"
		[ -f "$file" ] && [ "$(sha256 "$file")" = "$sum" ] || curl -fsSL -o "$file" "$PATCH_BASE/$name"
		[ "$(sha256 "$file")" = "$sum" ] || die "$name doesn't match its expected checksum. It may have been updated; check $PATCH_BASE/"
		if git -C "$SRC_DIR" apply --reverse --check "$file" >/dev/null 2>&1; then
			skip "$name (already applied)"
		else
			git -C "$SRC_DIR" apply "$file" || die "$name didn't apply cleanly to $SRC_DIR"
			ok "$name"
		fi
	done
}

build_qemu() {
	step "Building QEMU (about 5 to 15 minutes)"
	local build="$SRC_DIR/build-openvms"
	mkdir -p "$build"
	(
		cd "$build"
		../configure \
			--target-list=x86_64-softmmu \
			--enable-tcg \
			--enable-sdl \
			--disable-werror \
			--disable-docs \
			--disable-gtk \
			--disable-cocoa \
			--disable-vnc \
			--disable-spice-protocol \
			--disable-usb-redir \
			--disable-libusb \
			--disable-brlapi \
			--disable-fuse \
			--prefix="$PREFIX"
		make -j"$(ncpu)"
		make install
	)
	patched_qemu_installed || die "the build finished, but the installed QEMU doesn't have the max-insns-per-tb option."
	ok "installed to $PREFIX"
}

qemu() {
	if [ "$SKIP_BUILD" -eq 1 ]; then
		patched_qemu_installed || die "--skip-build was given, but there's no patched QEMU in $PREFIX"
		step "Using the patched QEMU in $PREFIX"
		skip "build skipped"
	elif patched_qemu_installed && [ "$REBUILD" -eq 0 ]; then
		step "Patched QEMU is already installed in $PREFIX"
		skip "build skipped (pass --rebuild to build it again)"
	else
		fetch_qemu
		apply_patches
		build_qemu
	fi
}

install_binaries() {
	step "Copying and signing the QEMU binaries"
	mkdir -p "$VM_DIR"
	local bin
	# macOS kills an unsigned copy on launch (exit 137), so clear quarantine and ad-hoc sign each copy.
	for bin in qemu-system-x86_64 qemu-img; do
		cp -f "$PREFIX/bin/$bin" "$VM_DIR/$bin"
		xattr -c "$VM_DIR/$bin" 2>/dev/null || true
		codesign -f -s - "$VM_DIR/$bin" 2>/dev/null
		ok "$bin"
	done
}

find_vmdk() { # the descriptor .vmdk: a small text file starting "# Disk DescriptorFile"
	# The 2026 kit pairs it with a big -flat.vmdk; other kits split the data into -s001, -s002…
	local f
	while IFS= read -r f; do
		if head -c 64 "$f" | LC_ALL=C grep -aq "Disk DescriptorFile"; then
			printf '%s\n' "$f"
			return 0
		fi
	done < <(find "$1" -type f -iname '*.vmdk' | sort)
	# No text descriptor (e.g. a single monolithic sparse disk): skip extent-looking names.
	find "$1" -type f -iname '*.vmdk' ! -iname '*-flat.vmdk' ! -iname '*-s[0-9][0-9][0-9].vmdk' ! -iname '*-f[0-9][0-9][0-9].vmdk' | sort | head -n 1
}

prepare_disk() {
	step "Preparing the OpenVMS disk"
	local img="$VM_DIR/qemu-img" base="$VM_DIR/openvms-vanilla.qcow2"
	if [ -e "$base" ]; then
		skip "openvms-vanilla.qcow2 already exists; left as it is"
	elif [ -z "$IMAGE" ]; then
		warn "No --image given, so there's no OpenVMS disk yet."
		warn "Register for the free Community License at https://vmssoftware.com/community/community-license/,"
		warn "then run this again with: --image ~/Downloads/community_2026.rar"
		return 0
	else
		[ -e "$IMAGE" ] || die "$IMAGE doesn't exist"
		local vmdk="" tmp=""
		case "$IMAGE" in
		*.rar | *.RAR)
			tmp="$(mktemp -d "$VM_DIR/.unpack.XXXXXX")"
			info "unpacking $(basename "$IMAGE") (about 1.3 GB)"
			unar -quiet -force-overwrite -output-directory "$tmp" "$IMAGE" >/dev/null
			vmdk="$(find_vmdk "$tmp")"
			;;
		*.vmdk | *.VMDK) vmdk="$IMAGE" ;;
		*) [ -d "$IMAGE" ] && vmdk="$(find_vmdk "$IMAGE")" ;;
		esac
		[ -n "$vmdk" ] || die "couldn't find a .vmdk disk in $IMAGE"
		info "converting $(basename "$vmdk") to qcow2"
		"$img" convert -p -f vmdk -O qcow2 "$vmdk" "$base.partial"
		mv "$base.partial" "$base"
		[ -z "$tmp" ] || rm -rf "$tmp"
		ok "openvms-vanilla.qcow2 (the pristine base disk)"
	fi

	if [ -e "$VM_DIR/openvms-run.qcow2" ]; then
		skip "openvms-run.qcow2 already exists; left as it is"
	elif [ -e "$base" ]; then
		(cd "$VM_DIR" && "$img" create -q -f qcow2 -b openvms-vanilla.qcow2 -F qcow2 openvms-run.qcow2)
		ok "openvms-run.qcow2 (copy-on-write overlay the VM writes to)"
	fi

	if [ -e "$VM_DIR/OVMF_VARS.qcow2" ]; then
		skip "OVMF_VARS.qcow2 already exists; left as it is"
	else
		local vars="$PREFIX/share/qemu/edk2-i386-vars.fd" fetched=""
		if [ ! -f "$vars" ]; then
			fetched="$(mktemp "$VM_DIR/.vars.XXXXXX")"
			info "downloading the UEFI variable store template from QEMU's repository"
			curl -fsSL "$VARS_URL" | bunzip2 >"$fetched"
			[ "$(sha256 "$fetched")" = "$VARS_SHA256" ] || {
				rm -f "$fetched"
				die "the UEFI variable store template doesn't match its expected checksum"
			}
			vars="$fetched"
		fi
		"$img" convert -f raw -O qcow2 "$vars" "$VM_DIR/OVMF_VARS.qcow2"
		[ -z "$fetched" ] || rm -f "$fetched"
		ok "OVMF_VARS.qcow2 (UEFI variable store)"
	fi
}

boot_script_body() {
	cat <<'EOF'
#!/bin/bash
# Boot OpenVMS x86-64 under patched QEMU (TCG). Written by the OpenVMS Field Notes Mac quickstart.
# At BOOTMGR> type OPA0, then BOOT. Log in as SYSTEM.
#
# The serial console is also on console.sock, and everything it prints goes to console.log.
#   Attach: socat -,raw,echo=0,escape=0x1d UNIX-CONNECT:"$BASEDIR/console.sock"   (Ctrl-] detaches)
# Shut down from inside VMS (@SYS$SYSTEM:SHUTDOWN) before closing the window.
BASEDIR="$(cd "$(dirname "$0")" && pwd)"
QEMU="$BASEDIR/qemu-system-x86_64"
EOF
	printf 'FIRMWARE="%s"\n' "$PREFIX/share/qemu"
	cat <<'EOF'

exec "$QEMU" \
  -machine q35,hpet=off \
  -accel tcg,thread=single,max-insns-per-tb=1 \
  -cpu max \
  -m 4096 \
  -smp 1 \
  -icount shift=auto,align=off \
  -rtc base=utc,clock=vm \
  -nodefaults \
  -L "$FIRMWARE" \
  -device VGA,vgamem_mb=8 \
  -drive if=pflash,format=raw,readonly=on,file="$FIRMWARE/edk2-x86_64-code.fd" \
  -drive if=pflash,format=qcow2,file="$BASEDIR/OVMF_VARS.qcow2" \
  -drive file="$BASEDIR/openvms-run.qcow2",format=qcow2,if=none,id=disk0 \
  -device ahci,id=ahci0 \
  -device ide-hd,drive=disk0,bus=ahci0.0 \
  -monitor unix:"$BASEDIR/monitor.sock",server,nowait \
  -chardev socket,id=con0,path="$BASEDIR/console.sock",server=on,wait=off,logfile="$BASEDIR/console.log" \
  -serial chardev:con0 \
  -display sdl \
  -no-reboot \
  -netdev user,id=net0,net=10.0.2.0/24,dhcpstart=10.0.2.15,hostfwd=tcp::2222-:22,hostfwd=tcp::2223-:23,hostfwd=tcp::2221-:21 \
  -device e1000e,netdev=net0
EOF
}

write_boot_script() {
	step "Writing the boot script"
	local target="$VM_DIR/boot-vms.sh"
	if [ -e "$target" ]; then
		boot_script_body >"$target.new"
		chmod +x "$target.new"
		skip "boot-vms.sh already exists; left as it is. The quickstart's version is in boot-vms.sh.new"
	else
		boot_script_body >"$target"
		chmod +x "$target"
		ok "boot-vms.sh"
	fi
}

summary() {
	step "Done"
	if [ -e "$VM_DIR/openvms-run.qcow2" ]; then
		cat <<EOF
    Start OpenVMS:

      cd "$VM_DIR" && ./boot-vms.sh

    At the ${B}BOOTMGR>${R} prompt type ${B}OPA0${R}, then ${B}BOOT${R}. The first boot takes 5 to 10 minutes.
    Log in as ${B}SYSTEM${R}. Once it's up:  ssh -p 2222 system@127.0.0.1

    Next: trim the startup services and save a snapshot (steps 9 and 10 of the Mac guide).
EOF
	else
		cat <<EOF
    QEMU is ready in $VM_DIR. To finish, get the OpenVMS Community License disk and run
    the quickstart again with  --image ~/Downloads/community_2026.rar  added.
EOF
	fi
}

main() {
	while [ $# -gt 0 ]; do
		case "$1" in
		--image | --vm-dir | --prefix | --src)
			# Check explicitly: a failed $(...) in an assignment would not stop the script.
			[ $# -ge 2 ] && [ -n "$2" ] && [ "${2#--}" = "$2" ] || die "$1 needs a value (see --help)"
			case "$1" in
			--image) IMAGE="$(expand_path "$2")" ;;
			--vm-dir) VM_DIR="$(expand_path "$2")" ;;
			--prefix) PREFIX="$(expand_path "$2")" ;;
			--src) SRC_DIR="$(expand_path "$2")" ;;
			esac
			shift
			;;
		--skip-build) SKIP_BUILD=1 ;;
		--rebuild) REBUILD=1 ;;
		-h | --help)
			usage
			return 0
			;;
		*) die "unknown option: $1 (see --help)" ;;
		esac
		shift
	done

	preflight
	[ "$SKIP_BUILD" -eq 1 ] || install_deps
	qemu
	install_binaries
	prepare_disk
	write_boot_script
	summary
}

# Everything runs from here, so a partly downloaded script does nothing.
main "$@"
