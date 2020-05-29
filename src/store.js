import { writable } from 'svelte/store';

function selectedTabState() {
    const { subscribe, set, update } = writable(null);

    return {
        subscribe,
        set
    };
}

export const selectedTab = selectedTabState();