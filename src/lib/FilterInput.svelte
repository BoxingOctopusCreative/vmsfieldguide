<script>
	// The filter box at the top of the command pages: a Flowbite input with a Lucide search icon,
	// and a badge with the match count.
	import { Input, Badge } from 'flowbite-svelte';
	import { Search } from '@lucide/svelte';

	/** @type {{ value: string, placeholder: string, label: string, count: string }} */
	let { value = $bindable(''), placeholder, label, count } = $props();
</script>

<div class="flex items-center gap-3 pt-2.5">
	<Input type="search" bind:value {placeholder} autocomplete="off" aria-label={label} class="ps-9 text-[15px]" wrapperClass="min-w-0 flex-1">
		{#snippet left()}<Search size={16} class="text-muted" aria-hidden="true" />{/snippet}
	</Input>
	<Badge color="gray" large class="shrink-0 whitespace-nowrap">{count}</Badge>
</div>
