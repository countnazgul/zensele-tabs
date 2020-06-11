(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.ZenseleTabs = {}));
}(this, (function (exports) { 'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        const z_index = (parseInt(computed_style.zIndex) || 0) - 1;
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', `display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ` +
            `overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: ${z_index};`);
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = `data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>`;
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            if (crossorigin) {
                unsubscribe();
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    const images = {
        arrowLeft: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAgAElEQVR4Xu3dVdckyXUu4G3Gn2RbMyNpRjIzMzOzj33IMjMzo2TGK58ri5lZBjHjDzgrVNlaPTPd81VkZWbFjv307VRGxn521Io3I6t7Pij8IUCAAAECBMoJfFC5ihVMgAABAgQIhABgERAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQIECAgABgDRAgQIAAgYICAkDBpiuZAAECBAgIANYAAQIECBAoKCAAFGy6kgkQ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",
        arrowRight: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAgAElEQVR4Xu3dVZck15U24HduzcweMjMzfrfDZA8zM3v442FmZma0JIMke37TMK9QR2nkVqurKjPiQOxHN7PWODPi7GfvWufNE1nVHxb/ESBAgAABAuUEPqxcxQomQIAAAQIEIgAYAgIECBAgUFBAACjYdCUTIECAAAEBwAwQIECAAIGCAgJAwaYrmQABAgQICABmgAABAgQIFBQQAAo2XckECBAgQEAAMAMECBAgQKCggABQsOlKJkCAAAECAoAZIECAAAECBQUEgIJNVzIBAgQIEBAAzAABAgQIECgoIAAUbLqSCRAgQICAAGAGCBAgQIBAQQEBoGDTlUyAAAECBAQAM0CAAAECBAoKCAAFm65kAgQIECAgAJgBAgQIECBQUEAAKNh0JRMgQIAAAQHADBAgQIAAgYICAkDBpiuZAAECBAgIAGaAAAECBAgUFBAACjZdyQQIECBAQAAwAwQIECBAoKCAAFCw6UomQIAAAQICgBkgQIAAAQIFBQSAgk1XMgECBAgQEADMAAECBAgQKCggABRsupIJECBAgIAAYAYIECBAgEBBAQGgYNOVTIAAAQIEBAAzQIAAAQIECgoIAAWbrmQCBAgQICAAmAECBAgQIFBQQAAo2HQlEyBAgAABAcAMECBAgACBggICQMGmK5kAAQIECAgAZoAAAQIECBQUEAAKNl3JBAgQIEBAADADBAgQIECgoIAAULDpSiZAgAABAgKAGSBAgAABAgUFBICCTVcyAQIECBAQAMwAAQIECBAoKCAAFGy6kgkQIECAgABgBggQIECAQEEBAaBg05VMgAABAgQEADNAgAABAgQKCggABZuuZAIECBAgIACYAQIECBAgUFBAACjYdCUTIECAAAEBwAwQIECAAIGCAgJAwaYrmQABAgQICABmgAABAgQIFBQQAAo2XckECBAgQEAAMAMECBAgQKCggABQsOlKJkCAAAECAoAZIECAAAECBQUEgIJNVzIBAgQIEBAAzAABAgQIECgoIAAUbLqSCRAgQICAAGAGCBAgQIBAQQEBoGDTlUyAAAECBAQAM0CAAAECBAoKCAAFm65kAgQIECAgAJgBAgQIECBQUEAAKNh0JRMgQIAAAQHADBAgQIAAgYICAkDBpiuZAAECBAgIAGaA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",
        remove: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMjMuOTU0IDIxLjAzbC05LjE4NC05LjA5NSA5LjA5Mi05LjE3NC0yLjgzMi0yLjgwNy05LjA5IDkuMTc5LTkuMTc2LTkuMDg4LTIuODEgMi44MSA5LjE4NiA5LjEwNS05LjA5NSA5LjE4NCAyLjgxIDIuODEgOS4xMTItOS4xOTIgOS4xOCA5LjF6Ii8+PC9zdmc+"
    };

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function selectedTabState() {
        const { subscribe, set, update } = writable(null);

        return {
            subscribe,
            set
        };
    }

    const selectedTab = selectedTabState();

    /* src\Tab.svelte generated by Svelte v3.23.0 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1y36n9w-style";
    	style.textContent = ".zenzele-tabs__tab.svelte-1y36n9w{border:none;border-bottom:2px solid transparent;color:#000000;cursor:pointer;max-width:300px;padding:0.5em 0.75em;flex:1}.zenzele-tabs__tab.svelte-1y36n9w:focus{outline:thin dotted}.zenzele-tabs__selected.svelte-1y36n9w{border-bottom:2px solid;color:var(--theme-color)}.zenzele-tabs__remove-container.svelte-1y36n9w{padding-left:10px;align-items:center}.zenzele-tabs__remove.svelte-1y36n9w{width:7px;height:7px;margin:0px;padding:0px;border:0px}input.svelte-1y36n9w:focus{outline:none}.titleContent.svelte-1y36n9w{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}";
    	append(document.head, style);
    }

    // (79:4) {#if isSelected}
    function create_if_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*enableDelete*/ ctx[3] && create_if_block_1(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*enableDelete*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (80:6) {#if enableDelete}
    function create_if_block_1(ctx) {
    	let div;
    	let input;
    	let input_src_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			attr(input, "class", "zenzele-tabs__remove svelte-1y36n9w");
    			attr(input, "type", "image");
    			attr(input, "alt", "Remove tab");
    			if (input.src !== (input_src_value = images.remove)) attr(input, "src", input_src_value);
    			attr(div, "class", "zenzele-tabs__remove-container svelte-1y36n9w");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);

    			if (!mounted) {
    				dispose = listen(input, "click", /*click_handler*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;
    	let if_block = /*isSelected*/ ctx[5] && create_if_block(ctx);

    	return {
    		c() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(/*label*/ ctx[1]);
    			t1 = space();
    			if (if_block) if_block.c();
    			attr(div0, "class", "titleContent svelte-1y36n9w");
    			attr(div0, "title", /*label*/ ctx[1]);
    			set_style(div1, "display", "flex");
    			set_style(div1, "justify-content", "center");
    			attr(div2, "class", "zenzele-tabs__tab svelte-1y36n9w");
    			set_style(div2, "--theme-color", /*color*/ ctx[2]);
    			toggle_class(div2, "zenzele-tabs__selected", /*isSelected*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div1);
    			append(div1, div0);
    			append(div0, t0);
    			/*div0_binding*/ ctx[8](div0);
    			append(div1, t1);
    			if (if_block) if_block.m(div1, null);

    			if (!mounted) {
    				dispose = listen(div2, "click", /*click_handler_1*/ ctx[10]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*label*/ 2) set_data(t0, /*label*/ ctx[1]);

    			if (dirty & /*label*/ 2) {
    				attr(div0, "title", /*label*/ ctx[1]);
    			}

    			if (/*isSelected*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*color*/ 4) {
    				set_style(div2, "--theme-color", /*color*/ ctx[2]);
    			}

    			if (dirty & /*isSelected*/ 32) {
    				toggle_class(div2, "zenzele-tabs__selected", /*isSelected*/ ctx[5]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div2);
    			/*div0_binding*/ ctx[8](null);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $selectedTab;
    	component_subscribe($$self, selectedTab, $$value => $$invalidate(6, $selectedTab = $$value));
    	const dispatch = createEventDispatcher();
    	let { index } = $$props;
    	let { label } = $$props;
    	let { color } = $$props;
    	let { enableDelete } = $$props;
    	let element;
    	let isSelected;

    	onMount(async () => {
    		
    	});

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, element = $$value);
    		});
    	}

    	const click_handler = () => dispatch("removeTab", index);

    	const click_handler_1 = () => {
    		element.focus();
    		if ($selectedTab != index) selectedTab.set(index);
    	};

    	$$self.$set = $$props => {
    		if ("index" in $$props) $$invalidate(0, index = $$props.index);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    		if ("enableDelete" in $$props) $$invalidate(3, enableDelete = $$props.enableDelete);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$selectedTab, index*/ 65) {
    			 $$invalidate(5, isSelected = $selectedTab === index);
    		}

    		if ($$self.$$.dirty & /*isSelected, element*/ 48) {
    			 {
    				if (isSelected === true && element) {
    					element.scrollIntoView();
    				}
    			}
    		}
    	};

    	return [
    		index,
    		label,
    		color,
    		enableDelete,
    		element,
    		isSelected,
    		$selectedTab,
    		dispatch,
    		div0_binding,
    		click_handler,
    		click_handler_1
    	];
    }

    class Tab extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1y36n9w-style")) add_css();

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			index: 0,
    			label: 1,
    			color: 2,
    			enableDelete: 3
    		});
    	}
    }

    /* src\TabList.svelte generated by Svelte v3.23.0 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1uiures-style";
    	style.textContent = ".zenzele-tabs__tab-list.svelte-1uiures{margin:0;padding:0;display:flex;flex-direction:row}.zenzele-tabs__navigation.svelte-1uiures{width:30px;border:0;margin:0px}.zenzele-tabs__center.svelte-1uiures{display:flex;align-items:center;justify-items:center}.zenzele-tabs__list.svelte-1uiures{overflow:hidden;flex-grow:2;display:flex}input.svelte-1uiures:focus{outline:none}.zenzele-tabs__add.svelte-1uiures{font-size:30px;display:flex;align-self:center;justify-content:center;min-width:30px;border-right:2px solid var(--theme-color);border-bottom:2px solid var(--theme-color);cursor:pointer}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	child_ctx[18] = i;
    	return child_ctx;
    }

    // (84:2) {#if enableAdd}
    function create_if_block_2(ctx) {
    	let div;
    	let t;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t = text("+");
    			attr(div, "class", "zenzele-tabs__add svelte-1uiures");
    			set_style(div, "--theme-color", /*color*/ ctx[1]);
    			attr(div, "title", "Add tab");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);

    			if (!mounted) {
    				dispose = listen(div, "click", /*addTab*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*color*/ 2) {
    				set_style(div, "--theme-color", /*color*/ ctx[1]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (93:2) {#if visibleArrows}
    function create_if_block_1$1(ctx) {
    	let div;
    	let input;
    	let input_src_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			attr(input, "class", "zenzele-tabs__navigation svelte-1uiures");
    			attr(input, "type", "image");
    			attr(input, "alt", "Previous tab");
    			if (input.src !== (input_src_value = images.arrowLeft)) attr(input, "src", input_src_value);
    			attr(div, "class", "zenzele-tabs__center svelte-1uiures");
    			attr(div, "title", "Previous tab");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);

    			if (!mounted) {
    				dispose = listen(div, "click", /*prevTab*/ ctx[10]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (107:4) {#each tabs as tab, index}
    function create_each_block(ctx) {
    	let current;

    	const tab = new Tab({
    			props: {
    				index: /*index*/ ctx[18],
    				color: /*color*/ ctx[1],
    				enableDelete: /*enableDelete*/ ctx[2],
    				label: /*tab*/ ctx[16]
    			}
    		});

    	tab.$on("removeTab", /*removeTab_handler*/ ctx[13]);

    	return {
    		c() {
    			create_component(tab.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tab, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tab_changes = {};
    			if (dirty & /*color*/ 2) tab_changes.color = /*color*/ ctx[1];
    			if (dirty & /*enableDelete*/ 4) tab_changes.enableDelete = /*enableDelete*/ ctx[2];
    			if (dirty & /*tabs*/ 1) tab_changes.label = /*tab*/ ctx[16];
    			tab.$set(tab_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tab.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tab.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tab, detaching);
    		}
    	};
    }

    // (118:2) {#if visibleArrows}
    function create_if_block$1(ctx) {
    	let div;
    	let input;
    	let input_src_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			attr(input, "class", "zenzele-tabs__navigation svelte-1uiures");
    			attr(input, "type", "image");
    			attr(input, "alt", "Next tab");
    			if (input.src !== (input_src_value = images.arrowRight)) attr(input, "src", input_src_value);
    			attr(div, "class", "zenzele-tabs__center svelte-1uiures");
    			attr(div, "title", "Next tab");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);

    			if (!mounted) {
    				dispose = listen(div, "click", /*nextTab*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let t0;
    	let t1;
    	let div0;
    	let div0_resize_listener;
    	let t2;
    	let current;
    	let if_block0 = /*enableAdd*/ ctx[3] && create_if_block_2(ctx);
    	let if_block1 = /*visibleArrows*/ ctx[6] && create_if_block_1$1(ctx);
    	let each_value = /*tabs*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block2 = /*visibleArrows*/ ctx[6] && create_if_block$1(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			if (if_block2) if_block2.c();
    			attr(div0, "class", "zenzele-tabs__list svelte-1uiures");
    			add_render_callback(() => /*div0_elementresize_handler*/ ctx[15].call(div0));
    			attr(div1, "class", "zenzele-tabs__tab-list svelte-1uiures");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append(div1, t0);
    			if (if_block1) if_block1.m(div1, null);
    			append(div1, t1);
    			append(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			/*div0_binding*/ ctx[14](div0);
    			div0_resize_listener = add_resize_listener(div0, /*div0_elementresize_handler*/ ctx[15].bind(div0));
    			append(div1, t2);
    			if (if_block2) if_block2.m(div1, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*enableAdd*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div1, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*visibleArrows*/ ctx[6]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					if_block1.m(div1, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*color, enableDelete, tabs, dispatch*/ 135) {
    				each_value = /*tabs*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*visibleArrows*/ ctx[6]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$1(ctx);
    					if_block2.c();
    					if_block2.m(div1, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			destroy_each(each_blocks, detaching);
    			/*div0_binding*/ ctx[14](null);
    			div0_resize_listener();
    			if (if_block2) if_block2.d();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $selectedTab;
    	component_subscribe($$self, selectedTab, $$value => $$invalidate(12, $selectedTab = $$value));
    	const dispatch = createEventDispatcher();
    	let { tabs } = $$props;
    	let { color } = $$props;
    	let { showNavigation } = $$props;
    	let { enableDelete } = $$props;
    	let { enableAdd } = $$props;
    	let tabsContainer;
    	let w;

    	function addTab() {
    		dispatch("addTab");
    	}

    	function nextTab() {
    		dispatch("tabIndexChange", $selectedTab + 1);
    	}

    	function prevTab() {
    		dispatch("tabIndexChange", $selectedTab - 1);
    	}

    	const removeTab_handler = event => dispatch("removeTab", event.detail);

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, tabsContainer = $$value);
    		});
    	}

    	function div0_elementresize_handler() {
    		w = this.clientWidth;
    		$$invalidate(5, w);
    	}

    	$$self.$set = $$props => {
    		if ("tabs" in $$props) $$invalidate(0, tabs = $$props.tabs);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("showNavigation" in $$props) $$invalidate(11, showNavigation = $$props.showNavigation);
    		if ("enableDelete" in $$props) $$invalidate(2, enableDelete = $$props.enableDelete);
    		if ("enableAdd" in $$props) $$invalidate(3, enableAdd = $$props.enableAdd);
    	};

    	let visibleArrows;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*showNavigation, tabsContainer, w*/ 2096) {
    			 {
    				if (!showNavigation) {
    					if (tabsContainer) {
    						if (w < tabsContainer.scrollWidth) {
    							$$invalidate(6, visibleArrows = true);
    						} else {
    							$$invalidate(6, visibleArrows = false);
    						}
    					}
    				}
    			}
    		}
    	};

    	 $$invalidate(6, visibleArrows = true);

    	return [
    		tabs,
    		color,
    		enableDelete,
    		enableAdd,
    		tabsContainer,
    		w,
    		visibleArrows,
    		dispatch,
    		addTab,
    		nextTab,
    		prevTab,
    		showNavigation,
    		$selectedTab,
    		removeTab_handler,
    		div0_binding,
    		div0_elementresize_handler
    	];
    }

    class TabList extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1uiures-style")) add_css$1();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			tabs: 0,
    			color: 1,
    			showNavigation: 11,
    			enableDelete: 2,
    			enableAdd: 3
    		});
    	}
    }

    /* src\Tabs.svelte generated by Svelte v3.23.0 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-1xbxhwz-style";
    	style.textContent = ".zenzele-tabs.svelte-1xbxhwz{height:42px;width:100%}";
    	append(document.head, style);
    }

    function create_fragment$2(ctx) {
    	let div;
    	let current;

    	const tablist = new TabList({
    			props: {
    				tabs: /*tabs*/ ctx[0],
    				color: /*color*/ ctx[1],
    				showNavigation: /*showNavigation*/ ctx[2],
    				enableDelete: /*enableDelete*/ ctx[3],
    				enableAdd: /*enableAdd*/ ctx[4]
    			}
    		});

    	tablist.$on("tabIndexChange", /*tabIndexChange_handler*/ ctx[11]);
    	tablist.$on("addTab", /*addTab_handler*/ ctx[12]);
    	tablist.$on("removeTab", /*removeTab_handler*/ ctx[13]);

    	return {
    		c() {
    			div = element("div");
    			create_component(tablist.$$.fragment);
    			attr(div, "class", "zenzele-tabs svelte-1xbxhwz");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(tablist, div, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const tablist_changes = {};
    			if (dirty & /*tabs*/ 1) tablist_changes.tabs = /*tabs*/ ctx[0];
    			if (dirty & /*color*/ 2) tablist_changes.color = /*color*/ ctx[1];
    			if (dirty & /*showNavigation*/ 4) tablist_changes.showNavigation = /*showNavigation*/ ctx[2];
    			if (dirty & /*enableDelete*/ 8) tablist_changes.enableDelete = /*enableDelete*/ ctx[3];
    			if (dirty & /*enableAdd*/ 16) tablist_changes.enableAdd = /*enableAdd*/ ctx[4];
    			tablist.$set(tablist_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablist.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablist.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(tablist);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $selectedTab;
    	component_subscribe($$self, selectedTab, $$value => $$invalidate(10, $selectedTab = $$value));
    	const dispatch = createEventDispatcher();
    	let { tabs = [] } = $$props;
    	let { color = "#4f81e5" } = $$props;
    	let { property = null } = $$props;
    	let { showNavigation = true } = $$props;
    	let { enableDelete = true } = $$props;
    	let { enableAdd = true } = $$props;

    	function selectedTabIndex(data) {
    		selectTab(data);
    	}

    	let originalTabs = [];

    	onMount(async () => {
    		// selectedTab.set(selectedTabIndex);
    		await tick();

    		if (property) {
    			$$invalidate(9, originalTabs = [...tabs]);

    			$$invalidate(0, tabs = tabs.map(function (t) {
    				return t[property];
    			}));
    		}
    	});

    	function selectTab(tab) {
    		if (tab < 0) return selectedTab.set(tabs.length - 1);
    		if (tab > tabs.length - 1) return selectedTab.set(0);
    		return selectedTab.set(tab);
    	}

    	const tabIndexChange_handler = event => selectTab(event.detail);
    	const addTab_handler = () => dispatch("addTab");
    	const removeTab_handler = event => dispatch("removeTab", event.detail);

    	$$self.$set = $$props => {
    		if ("tabs" in $$props) $$invalidate(0, tabs = $$props.tabs);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("property" in $$props) $$invalidate(7, property = $$props.property);
    		if ("showNavigation" in $$props) $$invalidate(2, showNavigation = $$props.showNavigation);
    		if ("enableDelete" in $$props) $$invalidate(3, enableDelete = $$props.enableDelete);
    		if ("enableAdd" in $$props) $$invalidate(4, enableAdd = $$props.enableAdd);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$selectedTab, tabs, property, originalTabs*/ 1665) {
    			 {
    				let data = {
    					index: $selectedTab,
    					data: tabs[$selectedTab]
    				};

    				if (property) {
    					data = {
    						index: $selectedTab,
    						data: originalTabs[$selectedTab]
    					};
    				}

    				dispatch("tabIndexChange", data);
    			}
    		}
    	};

    	return [
    		tabs,
    		color,
    		showNavigation,
    		enableDelete,
    		enableAdd,
    		dispatch,
    		selectTab,
    		property,
    		selectedTabIndex,
    		originalTabs,
    		$selectedTab,
    		tabIndexChange_handler,
    		addTab_handler,
    		removeTab_handler
    	];
    }

    class Tabs extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1xbxhwz-style")) add_css$2();

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			tabs: 0,
    			color: 1,
    			property: 7,
    			showNavigation: 2,
    			enableDelete: 3,
    			enableAdd: 4,
    			selectedTabIndex: 8
    		});
    	}

    	get selectedTabIndex() {
    		return this.$$.ctx[8];
    	}
    }

    exports.Tabs = Tabs;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
