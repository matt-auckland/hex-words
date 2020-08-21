
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
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
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (223:4) {#if filteredWordsCount > 0}
    function create_if_block_1(ctx) {
    	let h5;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			h5 = element("h5");
    			t0 = text("(");
    			t1 = text(/*filteredWordsCount*/ ctx[1]);
    			t2 = text(" words are hidden)");
    			attr_dev(h5, "class", "svelte-1mqu8d");
    			add_location(h5, file, 223, 6, 4198);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h5, anchor);
    			append_dev(h5, t0);
    			append_dev(h5, t1);
    			append_dev(h5, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filteredWordsCount*/ 2) set_data_dev(t1, /*filteredWordsCount*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(223:4) {#if filteredWordsCount > 0}",
    		ctx
    	});

    	return block;
    }

    // (230:4) {#each filteredWords as word}
    function create_each_block(ctx) {
    	let div3;
    	let div0;
    	let span;
    	let t0_value = /*word*/ ctx[11].word + "";
    	let t0;
    	let t1;
    	let t2_value = /*word*/ ctx[11].leet + "";
    	let t2;
    	let t3;
    	let div2;
    	let div1;

    	let t4_value = (/*clickedColour*/ ctx[4] == /*word*/ ctx[11].leet
    	? "COPIED!"
    	: "COPY") + "";

    	let t4;
    	let div2_style_value;
    	let t5;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = text("\n          → #");
    			t2 = text(t2_value);
    			t3 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(span, "class", "original svelte-1mqu8d");
    			add_location(span, file, 232, 10, 4403);
    			add_location(div0, file, 231, 8, 4387);
    			attr_dev(div1, "class", "copy-hex svelte-1mqu8d");
    			toggle_class(div1, "boop", /*clickedColour*/ ctx[4] == /*word*/ ctx[11].leet);
    			add_location(div1, file, 236, 10, 4567);
    			attr_dev(div2, "class", "colour svelte-1mqu8d");
    			attr_dev(div2, "style", div2_style_value = `background-color: #${/*word*/ ctx[11].leet};`);
    			add_location(div2, file, 235, 8, 4493);
    			attr_dev(div3, "class", "word svelte-1mqu8d");
    			add_location(div3, file, 230, 6, 4330);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, span);
    			append_dev(span, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, t4);
    			append_dev(div3, t5);

    			if (!mounted) {
    				dispose = listen_dev(
    					div3,
    					"click",
    					function () {
    						if (is_function(/*copyHex*/ ctx[6](/*word*/ ctx[11].leet))) /*copyHex*/ ctx[6](/*word*/ ctx[11].leet).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*filteredWords*/ 1 && t0_value !== (t0_value = /*word*/ ctx[11].word + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*filteredWords*/ 1 && t2_value !== (t2_value = /*word*/ ctx[11].leet + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*clickedColour, filteredWords*/ 17 && t4_value !== (t4_value = (/*clickedColour*/ ctx[4] == /*word*/ ctx[11].leet
    			? "COPIED!"
    			: "COPY") + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*clickedColour, filteredWords*/ 17) {
    				toggle_class(div1, "boop", /*clickedColour*/ ctx[4] == /*word*/ ctx[11].leet);
    			}

    			if (dirty & /*filteredWords*/ 1 && div2_style_value !== (div2_style_value = `background-color: #${/*word*/ ctx[11].leet};`)) {
    				attr_dev(div2, "style", div2_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(230:4) {#each filteredWords as word}",
    		ctx
    	});

    	return block;
    }

    // (245:2) {#if filteredWords.length == 0}
    function create_if_block(ctx) {
    	let h3;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text("No words containing \"");
    			t1 = text(/*searchString*/ ctx[2]);
    			t2 = text("\" found");
    			add_location(h3, file, 245, 4, 4797);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(h3, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*searchString*/ 4) set_data_dev(t1, /*searchString*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(245:2) {#if filteredWords.length == 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let a0;
    	let img;
    	let img_src_value;
    	let t0;
    	let h1;
    	let t1;
    	let h1_style_value;
    	let t2;
    	let p0;
    	let t3;
    	let a1;
    	let t5;
    	let t6;
    	let p1;
    	let t8;
    	let div0;
    	let label;
    	let t9;
    	let input;
    	let t10;
    	let h4;
    	let t11_value = `There ${/*filteredWords*/ ctx[0].length > 1 ? "are" : "is"} ${/*filteredWords*/ ctx[0].length} word${/*filteredWords*/ ctx[0].length > 1 ? "s" : ""}!` + "";
    	let t11;
    	let t12;
    	let t13;
    	let div1;
    	let t14;
    	let t15;
    	let footer;
    	let div2;
    	let t17;
    	let a2;
    	let t19;
    	let a3;
    	let t21;
    	let div3;
    	let mounted;
    	let dispose;
    	let if_block0 = /*filteredWordsCount*/ ctx[1] > 0 && create_if_block_1(ctx);
    	let each_value = /*filteredWords*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block1 = /*filteredWords*/ ctx[0].length == 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			a0 = element("a");
    			img = element("img");
    			t0 = space();
    			h1 = element("h1");
    			t1 = text("Hex-Words");
    			t2 = space();
    			p0 = element("p");
    			t3 = text("You're familiar with the standard\n    ");
    			a1 = element("a");
    			a1.textContent = "CSS colour keywords,";
    			t5 = text("\n    now learn about the ones hidden in hexcodes!");
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "Click on a colour to copy the colour's hexcode.";
    			t8 = space();
    			div0 = element("div");
    			label = element("label");
    			t9 = text("Search for words:\n      ");
    			input = element("input");
    			t10 = space();
    			h4 = element("h4");
    			t11 = text(t11_value);
    			t12 = space();
    			if (if_block0) if_block0.c();
    			t13 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t14 = space();
    			if (if_block1) if_block1.c();
    			t15 = space();
    			footer = element("footer");
    			div2 = element("div");
    			div2.textContent = "Created by Mathew Paul.";
    			t17 = space();
    			a2 = element("a");
    			a2.textContent = "Twitter";
    			t19 = space();
    			a3 = element("a");
    			a3.textContent = "Github";
    			t21 = space();
    			div3 = element("div");
    			div3.textContent = "↑";
    			if (img.src !== (img_src_value = "github.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "github logo");
    			attr_dev(img, "width", "30");
    			attr_dev(img, "class", "svelte-1mqu8d");
    			add_location(img, file, 195, 4, 3362);
    			attr_dev(a0, "class", "github svelte-1mqu8d");
    			attr_dev(a0, "href", "https://github.com/matt-auckland/hex-words");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file, 191, 2, 3261);
    			attr_dev(h1, "style", h1_style_value = `color:  #${/*lastCopiedColour*/ ctx[3]};`);
    			attr_dev(h1, "class", "svelte-1mqu8d");
    			add_location(h1, file, 197, 2, 3425);
    			attr_dev(a1, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#Color_keywords");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file, 200, 4, 3532);
    			add_location(p0, file, 198, 2, 3486);
    			add_location(p1, file, 207, 2, 3741);
    			attr_dev(input, "name", "filter");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "svelte-1mqu8d");
    			add_location(input, file, 212, 6, 3880);
    			attr_dev(label, "for", "filter");
    			add_location(label, file, 210, 4, 3829);
    			attr_dev(h4, "class", "svelte-1mqu8d");
    			add_location(h4, file, 218, 4, 4016);
    			attr_dev(div0, "class", "filter-cont svelte-1mqu8d");
    			add_location(div0, file, 209, 2, 3799);
    			attr_dev(div1, "class", "words svelte-1mqu8d");
    			add_location(div1, file, 228, 2, 4270);
    			attr_dev(main, "class", "svelte-1mqu8d");
    			add_location(main, file, 190, 0, 3252);
    			attr_dev(div2, "class", "me svelte-1mqu8d");
    			add_location(div2, file, 250, 2, 4877);
    			attr_dev(a2, "href", "https://twitter.com/matt4ttack");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "class", "svelte-1mqu8d");
    			add_location(a2, file, 251, 2, 4925);
    			attr_dev(a3, "href", "https://github.com/matt-auckland");
    			attr_dev(a3, "target", "_blank");
    			attr_dev(a3, "class", "svelte-1mqu8d");
    			add_location(a3, file, 252, 2, 4996);
    			attr_dev(footer, "class", "svelte-1mqu8d");
    			add_location(footer, file, 249, 0, 4866);
    			attr_dev(div3, "class", "back-to-top svelte-1mqu8d");
    			add_location(div3, file, 255, 0, 5077);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, a0);
    			append_dev(a0, img);
    			append_dev(main, t0);
    			append_dev(main, h1);
    			append_dev(h1, t1);
    			append_dev(main, t2);
    			append_dev(main, p0);
    			append_dev(p0, t3);
    			append_dev(p0, a1);
    			append_dev(p0, t5);
    			append_dev(main, t6);
    			append_dev(main, p1);
    			append_dev(main, t8);
    			append_dev(main, div0);
    			append_dev(div0, label);
    			append_dev(label, t9);
    			append_dev(label, input);
    			set_input_value(input, /*searchString*/ ctx[2]);
    			append_dev(div0, t10);
    			append_dev(div0, h4);
    			append_dev(h4, t11);
    			append_dev(div0, t12);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(main, t13);
    			append_dev(main, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(main, t14);
    			if (if_block1) if_block1.m(main, null);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div2);
    			append_dev(footer, t17);
    			append_dev(footer, a2);
    			append_dev(footer, t19);
    			append_dev(footer, a3);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, div3, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[8]),
    					listen_dev(input, "keydown", /*filterWords*/ ctx[5], false, false, false),
    					listen_dev(div3, "click", /*click_handler*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*lastCopiedColour*/ 8 && h1_style_value !== (h1_style_value = `color:  #${/*lastCopiedColour*/ ctx[3]};`)) {
    				attr_dev(h1, "style", h1_style_value);
    			}

    			if (dirty & /*searchString*/ 4 && input.value !== /*searchString*/ ctx[2]) {
    				set_input_value(input, /*searchString*/ ctx[2]);
    			}

    			if (dirty & /*filteredWords*/ 1 && t11_value !== (t11_value = `There ${/*filteredWords*/ ctx[0].length > 1 ? "are" : "is"} ${/*filteredWords*/ ctx[0].length} word${/*filteredWords*/ ctx[0].length > 1 ? "s" : ""}!` + "")) set_data_dev(t11, t11_value);

    			if (/*filteredWordsCount*/ ctx[1] > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*copyHex, filteredWords, clickedColour*/ 81) {
    				each_value = /*filteredWords*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*filteredWords*/ ctx[0].length == 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(main, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks, detaching);
    			if (if_block1) if_block1.d();
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(footer);
    			if (detaching) detach_dev(t21);
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { words } = $$props;
    	let filteredWords = words;
    	let filteredWordsCount = 0;
    	let searchString = "";
    	let timeout;

    	function filterWords() {
    		if (timeout) {
    			window.clearTimeout(timeout);
    		}

    		timeout = window.setTimeout(
    			function () {
    				$$invalidate(0, filteredWords = words.filter(word => word.word.includes(searchString)));
    				$$invalidate(1, filteredWordsCount = words.length - filteredWords.length);
    			},
    			100
    		);
    	}

    	let lastCopiedColour;
    	let clickedColour;

    	function copyHex(hexcode) {
    		$$invalidate(3, lastCopiedColour = hexcode);
    		$$invalidate(4, clickedColour = hexcode);

    		navigator.clipboard.writeText(`#${hexcode}`).then(() => {
    			console.log("copied!");
    		});

    		setTimeout(
    			function () {
    				$$invalidate(4, clickedColour = null);
    			},
    			400
    		);
    	}

    	const writable_props = ["words"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input_input_handler() {
    		searchString = this.value;
    		$$invalidate(2, searchString);
    	}

    	const click_handler = () => window.scrollTo(0, 0);

    	$$self.$$set = $$props => {
    		if ("words" in $$props) $$invalidate(7, words = $$props.words);
    	};

    	$$self.$capture_state = () => ({
    		words,
    		filteredWords,
    		filteredWordsCount,
    		searchString,
    		timeout,
    		filterWords,
    		lastCopiedColour,
    		clickedColour,
    		copyHex
    	});

    	$$self.$inject_state = $$props => {
    		if ("words" in $$props) $$invalidate(7, words = $$props.words);
    		if ("filteredWords" in $$props) $$invalidate(0, filteredWords = $$props.filteredWords);
    		if ("filteredWordsCount" in $$props) $$invalidate(1, filteredWordsCount = $$props.filteredWordsCount);
    		if ("searchString" in $$props) $$invalidate(2, searchString = $$props.searchString);
    		if ("timeout" in $$props) timeout = $$props.timeout;
    		if ("lastCopiedColour" in $$props) $$invalidate(3, lastCopiedColour = $$props.lastCopiedColour);
    		if ("clickedColour" in $$props) $$invalidate(4, clickedColour = $$props.clickedColour);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		filteredWords,
    		filteredWordsCount,
    		searchString,
    		lastCopiedColour,
    		clickedColour,
    		filterWords,
    		copyHex,
    		words,
    		input_input_handler,
    		click_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { words: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*words*/ ctx[7] === undefined && !("words" in props)) {
    			console_1.warn("<App> was created without expected prop 'words'");
    		}
    	}

    	get words() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set words(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var words = [
    	{
    		word: "aaliis",
    		leet: "AA1115"
    	},
    	{
    		word: "abacas",
    		leet: "ABACA5"
    	},
    	{
    		word: "abacli",
    		leet: "ABAC11"
    	},
    	{
    		word: "abacot",
    		leet: "ABAC07"
    	},
    	{
    		word: "abadia",
    		leet: "ABAD1A"
    	},
    	{
    		word: "abased",
    		leet: "ABA5ED"
    	},
    	{
    		word: "abases",
    		leet: "ABA5E5"
    	},
    	{
    		word: "abasgi",
    		leet: "ABA561"
    	},
    	{
    		word: "abasia",
    		leet: "ABA51A"
    	},
    	{
    		word: "abasic",
    		leet: "ABA51C"
    	},
    	{
    		word: "abasio",
    		leet: "ABA510"
    	},
    	{
    		word: "abassi",
    		leet: "ABA551"
    	},
    	{
    		word: "abated",
    		leet: "ABA7ED"
    	},
    	{
    		word: "abates",
    		leet: "ABA7E5"
    	},
    	{
    		word: "abatic",
    		leet: "ABA71C"
    	},
    	{
    		word: "abatis",
    		leet: "ABA715"
    	},
    	{
    		word: "abbasi",
    		leet: "ABBA51"
    	},
    	{
    		word: "abbate",
    		leet: "ABBA7E"
    	},
    	{
    		word: "abbess",
    		leet: "ABBE55"
    	},
    	{
    		word: "abbest",
    		leet: "ABBE57"
    	},
    	{
    		word: "abbots",
    		leet: "ABB075"
    	},
    	{
    		word: "abbott",
    		leet: "ABB077"
    	},
    	{
    		word: "abcess",
    		leet: "ABCE55"
    	},
    	{
    		word: "abdali",
    		leet: "ABDA11"
    	},
    	{
    		word: "abdest",
    		leet: "ABDE57"
    	},
    	{
    		word: "abdiel",
    		leet: "ABD1E1"
    	},
    	{
    		word: "abedge",
    		leet: "ABED6E"
    	},
    	{
    		word: "abegge",
    		leet: "ABE66E"
    	},
    	{
    		word: "abeigh",
    		leet: "ABE164"
    	},
    	{
    		word: "abeles",
    		leet: "ABE1E5"
    	},
    	{
    		word: "abelia",
    		leet: "ABE11A"
    	},
    	{
    		word: "abesse",
    		leet: "ABE55E"
    	},
    	{
    		word: "abidal",
    		leet: "AB1DA1"
    	},
    	{
    		word: "abided",
    		leet: "AB1DED"
    	},
    	{
    		word: "abides",
    		leet: "AB1DE5"
    	},
    	{
    		word: "abiegh",
    		leet: "AB1E64"
    	},
    	{
    		word: "abigei",
    		leet: "AB16E1"
    	},
    	{
    		word: "abilao",
    		leet: "AB11A0"
    	},
    	{
    		word: "abilla",
    		leet: "AB111A"
    	},
    	{
    		word: "abject",
    		leet: "AB9EC7"
    	},
    	{
    		word: "ablach",
    		leet: "AB1AC4"
    	},
    	{
    		word: "ablate",
    		leet: "AB1A7E"
    	},
    	{
    		word: "ablaze",
    		leet: "AB1A2E"
    	},
    	{
    		word: "ablest",
    		leet: "AB1E57"
    	},
    	{
    		word: "abodah",
    		leet: "AB0DA4"
    	},
    	{
    		word: "aboded",
    		leet: "AB0DED"
    	},
    	{
    		word: "abodes",
    		leet: "AB0DE5"
    	},
    	{
    		word: "abolla",
    		leet: "AB011A"
    	},
    	{
    		word: "abseil",
    		leet: "AB5E11"
    	},
    	{
    		word: "absist",
    		leet: "AB5157"
    	},
    	{
    		word: "absoil",
    		leet: "AB5011"
    	},
    	{
    		word: "acacia",
    		leet: "ACAC1A"
    	},
    	{
    		word: "acadia",
    		leet: "ACAD1A"
    	},
    	{
    		word: "acadie",
    		leet: "ACAD1E"
    	},
    	{
    		word: "acates",
    		leet: "ACA7E5"
    	},
    	{
    		word: "accede",
    		leet: "ACCEDE"
    	},
    	{
    		word: "access",
    		leet: "ACCE55"
    	},
    	{
    		word: "accise",
    		leet: "ACC15E"
    	},
    	{
    		word: "accite",
    		leet: "ACC17E"
    	},
    	{
    		word: "accoil",
    		leet: "ACC011"
    	},
    	{
    		word: "accoll",
    		leet: "ACC011"
    	},
    	{
    		word: "accost",
    		leet: "ACC057"
    	},
    	{
    		word: "acedia",
    		leet: "ACED1A"
    	},
    	{
    		word: "aceite",
    		leet: "ACE17E"
    	},
    	{
    		word: "acetal",
    		leet: "ACE7A1"
    	},
    	{
    		word: "acetic",
    		leet: "ACE71C"
    	},
    	{
    		word: "acetla",
    		leet: "ACE71A"
    	},
    	{
    		word: "acetol",
    		leet: "ACE701"
    	},
    	{
    		word: "achafe",
    		leet: "AC4AFE"
    	},
    	{
    		word: "achage",
    		leet: "AC4A6E"
    	},
    	{
    		word: "achate",
    		leet: "AC4A7E"
    	},
    	{
    		word: "acheat",
    		leet: "AC4EA7"
    	},
    	{
    		word: "achech",
    		leet: "AC4EC4"
    	},
    	{
    		word: "achete",
    		leet: "AC4E7E"
    	},
    	{
    		word: "achill",
    		leet: "AC4111"
    	},
    	{
    		word: "achtel",
    		leet: "AC47E1"
    	},
    	{
    		word: "acidic",
    		leet: "AC1D1C"
    	},
    	{
    		word: "acoela",
    		leet: "AC0E1A"
    	},
    	{
    		word: "actaea",
    		leet: "AC7AEA"
    	},
    	{
    		word: "actiad",
    		leet: "AC71AD"
    	},
    	{
    		word: "adages",
    		leet: "ADA6E5"
    	},
    	{
    		word: "adagio",
    		leet: "ADA610"
    	},
    	{
    		word: "adaize",
    		leet: "ADA12E"
    	},
    	{
    		word: "adalat",
    		leet: "ADA1A7"
    	},
    	{
    		word: "adalid",
    		leet: "ADA11D"
    	},
    	{
    		word: "adatis",
    		leet: "ADA715"
    	},
    	{
    		word: "addice",
    		leet: "ADD1CE"
    	},
    	{
    		word: "addict",
    		leet: "ADD1C7"
    	},
    	{
    		word: "addita",
    		leet: "ADD17A"
    	},
    	{
    		word: "addled",
    		leet: "ADD1ED"
    	},
    	{
    		word: "addles",
    		leet: "ADD1E5"
    	},
    	{
    		word: "adelea",
    		leet: "ADE1EA"
    	},
    	{
    		word: "adelia",
    		leet: "ADE11A"
    	},
    	{
    		word: "adeste",
    		leet: "ADE57E"
    	},
    	{
    		word: "adiate",
    		leet: "AD1A7E"
    	},
    	{
    		word: "adicea",
    		leet: "AD1CEA"
    	},
    	{
    		word: "adigei",
    		leet: "AD16E1"
    	},
    	{
    		word: "adighe",
    		leet: "AD164E"
    	},
    	{
    		word: "adight",
    		leet: "AD1647"
    	},
    	{
    		word: "adital",
    		leet: "AD17A1"
    	},
    	{
    		word: "aditio",
    		leet: "AD1710"
    	},
    	{
    		word: "adject",
    		leet: "AD9EC7"
    	},
    	{
    		word: "adjiga",
    		leet: "AD916A"
    	},
    	{
    		word: "adless",
    		leet: "AD1E55"
    	},
    	{
    		word: "adobes",
    		leet: "AD0BE5"
    	},
    	{
    		word: "adobos",
    		leet: "AD0B05"
    	},
    	{
    		word: "aecial",
    		leet: "AEC1A1"
    	},
    	{
    		word: "aedegi",
    		leet: "AEDE61"
    	},
    	{
    		word: "aedile",
    		leet: "AED11E"
    	},
    	{
    		word: "aefald",
    		leet: "AEFA1D"
    	},
    	{
    		word: "aeolia",
    		leet: "AE011A"
    	},
    	{
    		word: "aeolic",
    		leet: "AE011C"
    	},
    	{
    		word: "aeolid",
    		leet: "AE011D"
    	},
    	{
    		word: "aeolis",
    		leet: "AE0115"
    	},
    	{
    		word: "aestii",
    		leet: "AE5711"
    	},
    	{
    		word: "afaced",
    		leet: "AFACED"
    	},
    	{
    		word: "afetal",
    		leet: "AFE7A1"
    	},
    	{
    		word: "affect",
    		leet: "AFFEC7"
    	},
    	{
    		word: "affich",
    		leet: "AFF1C4"
    	},
    	{
    		word: "affied",
    		leet: "AFF1ED"
    	},
    	{
    		word: "affies",
    		leet: "AFF1E5"
    	},
    	{
    		word: "affile",
    		leet: "AFF11E"
    	},
    	{
    		word: "afield",
    		leet: "AF1E1D"
    	},
    	{
    		word: "afloat",
    		leet: "AF10A7"
    	},
    	{
    		word: "afocal",
    		leet: "AF0CA1"
    	},
    	{
    		word: "afshah",
    		leet: "AF54A4"
    	},
    	{
    		word: "aftaba",
    		leet: "AF7ABA"
    	},
    	{
    		word: "aftosa",
    		leet: "AF705A"
    	},
    	{
    		word: "agaces",
    		leet: "A6ACE5"
    	},
    	{
    		word: "agadic",
    		leet: "A6AD1C"
    	},
    	{
    		word: "agates",
    		leet: "A6A7E5"
    	},
    	{
    		word: "agatha",
    		leet: "A6A74A"
    	},
    	{
    		word: "agazed",
    		leet: "A6A2ED"
    	},
    	{
    		word: "ageist",
    		leet: "A6E157"
    	},
    	{
    		word: "aggest",
    		leet: "A66E57"
    	},
    	{
    		word: "aggies",
    		leet: "A661E5"
    	},
    	{
    		word: "aghast",
    		leet: "A64A57"
    	},
    	{
    		word: "agible",
    		leet: "A61B1E"
    	},
    	{
    		word: "agists",
    		leet: "A61575"
    	},
    	{
    		word: "aglaia",
    		leet: "A61A1A"
    	},
    	{
    		word: "aglaos",
    		leet: "A61A05"
    	},
    	{
    		word: "agleaf",
    		leet: "A61EAF"
    	},
    	{
    		word: "aglets",
    		leet: "A61E75"
    	},
    	{
    		word: "agogic",
    		leet: "A6061C"
    	},
    	{
    		word: "ahchoo",
    		leet: "A4C400"
    	},
    	{
    		word: "aholds",
    		leet: "A401D5"
    	},
    	{
    		word: "aiglet",
    		leet: "A161E7"
    	},
    	{
    		word: "aiolis",
    		leet: "A10115"
    	},
    	{
    		word: "aisled",
    		leet: "A151ED"
    	},
    	{
    		word: "aisles",
    		leet: "A151E5"
    	},
    	{
    		word: "alacha",
    		leet: "A1AC4A"
    	},
    	{
    		word: "alagao",
    		leet: "A1A6A0"
    	},
    	{
    		word: "alahee",
    		leet: "A1A4EE"
    	},
    	{
    		word: "alaihi",
    		leet: "A1A141"
    	},
    	{
    		word: "alaite",
    		leet: "A1A17E"
    	},
    	{
    		word: "alalia",
    		leet: "A1A11A"
    	},
    	{
    		word: "alaloi",
    		leet: "A1A101"
    	},
    	{
    		word: "alasas",
    		leet: "A1A5A5"
    	},
    	{
    		word: "alated",
    		leet: "A1A7ED"
    	},
    	{
    		word: "albata",
    		leet: "A1BA7A"
    	},
    	{
    		word: "albedo",
    		leet: "A1BED0"
    	},
    	{
    		word: "albeit",
    		leet: "A1BE17"
    	},
    	{
    		word: "albite",
    		leet: "A1B17E"
    	},
    	{
    		word: "alcade",
    		leet: "A1CADE"
    	},
    	{
    		word: "alcaic",
    		leet: "A1CA1C"
    	},
    	{
    		word: "alcaid",
    		leet: "A1CA1D"
    	},
    	{
    		word: "alcali",
    		leet: "A1CA11"
    	},
    	{
    		word: "alcedo",
    		leet: "A1CED0"
    	},
    	{
    		word: "alcids",
    		leet: "A1C1D5"
    	},
    	{
    		word: "alclad",
    		leet: "A1C1AD"
    	},
    	{
    		word: "aldeia",
    		leet: "A1DE1A"
    	},
    	{
    		word: "aldide",
    		leet: "A1D1DE"
    	},
    	{
    		word: "aldols",
    		leet: "A1D015"
    	},
    	{
    		word: "aldose",
    		leet: "A1D05E"
    	},
    	{
    		word: "alette",
    		leet: "A1E77E"
    	},
    	{
    		word: "alfaje",
    		leet: "A1FA9E"
    	},
    	{
    		word: "algate",
    		leet: "A16A7E"
    	},
    	{
    		word: "algedi",
    		leet: "A16ED1"
    	},
    	{
    		word: "algedo",
    		leet: "A16ED0"
    	},
    	{
    		word: "algist",
    		leet: "A16157"
    	},
    	{
    		word: "algoid",
    		leet: "A1601D"
    	},
    	{
    		word: "alhagi",
    		leet: "A14A61"
    	},
    	{
    		word: "alibis",
    		leet: "A11B15"
    	},
    	{
    		word: "alible",
    		leet: "A11B1E"
    	},
    	{
    		word: "alicia",
    		leet: "A11C1A"
    	},
    	{
    		word: "alidad",
    		leet: "A11DAD"
    	},
    	{
    		word: "alight",
    		leet: "A11647"
    	},
    	{
    		word: "alioth",
    		leet: "A11074"
    	},
    	{
    		word: "alisos",
    		leet: "A11505"
    	},
    	{
    		word: "aljoba",
    		leet: "A190BA"
    	},
    	{
    		word: "allect",
    		leet: "A11EC7"
    	},
    	{
    		word: "allege",
    		leet: "A11E6E"
    	},
    	{
    		word: "allele",
    		leet: "A11E1E"
    	},
    	{
    		word: "allice",
    		leet: "A111CE"
    	},
    	{
    		word: "allied",
    		leet: "A111ED"
    	},
    	{
    		word: "allies",
    		leet: "A111E5"
    	},
    	{
    		word: "allods",
    		leet: "A110D5"
    	},
    	{
    		word: "allose",
    		leet: "A1105E"
    	},
    	{
    		word: "allots",
    		leet: "A11075"
    	},
    	{
    		word: "alodia",
    		leet: "A10D1A"
    	},
    	{
    		word: "alogia",
    		leet: "A1061A"
    	},
    	{
    		word: "alohas",
    		leet: "A104A5"
    	},
    	{
    		word: "aloofe",
    		leet: "A100FE"
    	},
    	{
    		word: "aloose",
    		leet: "A1005E"
    	},
    	{
    		word: "altaic",
    		leet: "A17A1C"
    	},
    	{
    		word: "altaid",
    		leet: "A17A1D"
    	},
    	{
    		word: "alteza",
    		leet: "A17E2A"
    	},
    	{
    		word: "althea",
    		leet: "A174EA"
    	},
    	{
    		word: "altica",
    		leet: "A171CA"
    	},
    	{
    		word: "asahel",
    		leet: "A5A4E1"
    	},
    	{
    		word: "asbest",
    		leet: "A5BE57"
    	},
    	{
    		word: "ascebc",
    		leet: "A5CEBC"
    	},
    	{
    		word: "ascill",
    		leet: "A5C111"
    	},
    	{
    		word: "ascitb",
    		leet: "A5C17B"
    	},
    	{
    		word: "ascite",
    		leet: "A5C17E"
    	},
    	{
    		word: "ascots",
    		leet: "A5C075"
    	},
    	{
    		word: "asdics",
    		leet: "A5D1C5"
    	},
    	{
    		word: "aselli",
    		leet: "A5E111"
    	},
    	{
    		word: "asfast",
    		leet: "A5FA57"
    	},
    	{
    		word: "asides",
    		leet: "A51DE5"
    	},
    	{
    		word: "asilid",
    		leet: "A5111D"
    	},
    	{
    		word: "asitia",
    		leet: "A5171A"
    	},
    	{
    		word: "assail",
    		leet: "A55A11"
    	},
    	{
    		word: "assais",
    		leet: "A55A15"
    	},
    	{
    		word: "assate",
    		leet: "A55A7E"
    	},
    	{
    		word: "assbaa",
    		leet: "A55BAA"
    	},
    	{
    		word: "asseal",
    		leet: "A55EA1"
    	},
    	{
    		word: "asself",
    		leet: "A55E1F"
    	},
    	{
    		word: "assess",
    		leet: "A55E55"
    	},
    	{
    		word: "asseth",
    		leet: "A55E74"
    	},
    	{
    		word: "assets",
    		leet: "A55E75"
    	},
    	{
    		word: "assisa",
    		leet: "A5515A"
    	},
    	{
    		word: "assise",
    		leet: "A5515E"
    	},
    	{
    		word: "assish",
    		leet: "A55154"
    	},
    	{
    		word: "assisi",
    		leet: "A55151"
    	},
    	{
    		word: "assist",
    		leet: "A55157"
    	},
    	{
    		word: "assith",
    		leet: "A55174"
    	},
    	{
    		word: "assize",
    		leet: "A5512E"
    	},
    	{
    		word: "assoil",
    		leet: "A55011"
    	},
    	{
    		word: "astate",
    		leet: "A57A7E"
    	},
    	{
    		word: "astite",
    		leet: "A5717E"
    	},
    	{
    		word: "atabal",
    		leet: "A7ABA1"
    	},
    	{
    		word: "atabeg",
    		leet: "A7ABE6"
    	},
    	{
    		word: "atbash",
    		leet: "A7BA54"
    	},
    	{
    		word: "ateles",
    		leet: "A7E1E5"
    	},
    	{
    		word: "atelic",
    		leet: "A7E11C"
    	},
    	{
    		word: "athold",
    		leet: "A7401D"
    	},
    	{
    		word: "atlatl",
    		leet: "A71A71"
    	},
    	{
    		word: "atloid",
    		leet: "A7101D"
    	},
    	{
    		word: "atocha",
    		leet: "A70C4A"
    	},
    	{
    		word: "atocia",
    		leet: "A70C1A"
    	},
    	{
    		word: "atolls",
    		leet: "A70115"
    	},
    	{
    		word: "atossa",
    		leet: "A7055A"
    	},
    	{
    		word: "attach",
    		leet: "A77AC4"
    	},
    	{
    		word: "atteal",
    		leet: "A77EA1"
    	},
    	{
    		word: "attest",
    		leet: "A77E57"
    	},
    	{
    		word: "attice",
    		leet: "A771CE"
    	},
    	{
    		word: "attics",
    		leet: "A771C5"
    	},
    	{
    		word: "attila",
    		leet: "A7711A"
    	},
    	{
    		word: "azalea",
    		leet: "A2A1EA"
    	},
    	{
    		word: "azazel",
    		leet: "A2A2E1"
    	},
    	{
    		word: "azides",
    		leet: "A21DE5"
    	},
    	{
    		word: "aziola",
    		leet: "A2101A"
    	},
    	{
    		word: "azoles",
    		leet: "A201E5"
    	},
    	{
    		word: "azolla",
    		leet: "A2011A"
    	},
    	{
    		word: "azotea",
    		leet: "A207EA"
    	},
    	{
    		word: "azoted",
    		leet: "A207ED"
    	},
    	{
    		word: "azotes",
    		leet: "A207E5"
    	},
    	{
    		word: "azoths",
    		leet: "A20745"
    	},
    	{
    		word: "azotic",
    		leet: "A2071C"
    	},
    	{
    		word: "azteca",
    		leet: "A27ECA"
    	},
    	{
    		word: "aztecs",
    		leet: "A27EC5"
    	},
    	{
    		word: "babbie",
    		leet: "BABB1E"
    	},
    	{
    		word: "babbit",
    		leet: "BABB17"
    	},
    	{
    		word: "babble",
    		leet: "BABB1E"
    	},
    	{
    		word: "babels",
    		leet: "BABE15"
    	},
    	{
    		word: "babied",
    		leet: "BAB1ED"
    	},
    	{
    		word: "babies",
    		leet: "BAB1E5"
    	},
    	{
    		word: "babish",
    		leet: "BAB154"
    	},
    	{
    		word: "babist",
    		leet: "BAB157"
    	},
    	{
    		word: "babite",
    		leet: "BAB17E"
    	},
    	{
    		word: "bablah",
    		leet: "BAB1A4"
    	},
    	{
    		word: "babloh",
    		leet: "BAB104"
    	},
    	{
    		word: "babool",
    		leet: "BAB001"
    	},
    	{
    		word: "baboos",
    		leet: "BAB005"
    	},
    	{
    		word: "baboot",
    		leet: "BAB007"
    	},
    	{
    		word: "bacaba",
    		leet: "BACABA"
    	},
    	{
    		word: "bacach",
    		leet: "BACAC4"
    	},
    	{
    		word: "baccae",
    		leet: "BACCAE"
    	},
    	{
    		word: "bached",
    		leet: "BAC4ED"
    	},
    	{
    		word: "bachel",
    		leet: "BAC4E1"
    	},
    	{
    		word: "baches",
    		leet: "BAC4E5"
    	},
    	{
    		word: "bacile",
    		leet: "BAC11E"
    	},
    	{
    		word: "badaga",
    		leet: "BADA6A"
    	},
    	{
    		word: "badass",
    		leet: "BADA55"
    	},
    	{
    		word: "baddie",
    		leet: "BADD1E"
    	},
    	{
    		word: "badged",
    		leet: "BAD6ED"
    	},
    	{
    		word: "badges",
    		leet: "BAD6E5"
    	},
    	{
    		word: "baffed",
    		leet: "BAFFED"
    	},
    	{
    		word: "baffle",
    		leet: "BAFF1E"
    	},
    	{
    		word: "baftah",
    		leet: "BAF7A4"
    	},
    	{
    		word: "bagass",
    		leet: "BA6A55"
    	},
    	{
    		word: "bagdad",
    		leet: "BA6DAD"
    	},
    	{
    		word: "bagels",
    		leet: "BA6E15"
    	},
    	{
    		word: "bagged",
    		leet: "BA66ED"
    	},
    	{
    		word: "baggie",
    		leet: "BA661E"
    	},
    	{
    		word: "baggit",
    		leet: "BA6617"
    	},
    	{
    		word: "baghla",
    		leet: "BA641A"
    	},
    	{
    		word: "bagios",
    		leet: "BA6105"
    	},
    	{
    		word: "bagobo",
    		leet: "BA60B0"
    	},
    	{
    		word: "bahada",
    		leet: "BA4ADA"
    	},
    	{
    		word: "bailed",
    		leet: "BA11ED"
    	},
    	{
    		word: "bailee",
    		leet: "BA11EE"
    	},
    	{
    		word: "bailie",
    		leet: "BA111E"
    	},
    	{
    		word: "bailli",
    		leet: "BA1111"
    	},
    	{
    		word: "baited",
    		leet: "BA17ED"
    	},
    	{
    		word: "baizas",
    		leet: "BA12A5"
    	},
    	{
    		word: "baized",
    		leet: "BA12ED"
    	},
    	{
    		word: "baizes",
    		leet: "BA12E5"
    	},
    	{
    		word: "bajada",
    		leet: "BA9ADA"
    	},
    	{
    		word: "balada",
    		leet: "BA1ADA"
    	},
    	{
    		word: "balafo",
    		leet: "BA1AF0"
    	},
    	{
    		word: "balaic",
    		leet: "BA1A1C"
    	},
    	{
    		word: "balaos",
    		leet: "BA1A05"
    	},
    	{
    		word: "balata",
    		leet: "BA1A7A"
    	},
    	{
    		word: "balate",
    		leet: "BA1A7E"
    	},
    	{
    		word: "balboa",
    		leet: "BA1B0A"
    	},
    	{
    		word: "balche",
    		leet: "BA1C4E"
    	},
    	{
    		word: "balded",
    		leet: "BA1DED"
    	},
    	{
    		word: "baldie",
    		leet: "BA1D1E"
    	},
    	{
    		word: "balete",
    		leet: "BA1E7E"
    	},
    	{
    		word: "balija",
    		leet: "BA119A"
    	},
    	{
    		word: "balita",
    		leet: "BA117A"
    	},
    	{
    		word: "baliti",
    		leet: "BA1171"
    	},
    	{
    		word: "balize",
    		leet: "BA112E"
    	},
    	{
    		word: "ballad",
    		leet: "BA11AD"
    	},
    	{
    		word: "ballas",
    		leet: "BA11A5"
    	},
    	{
    		word: "ballat",
    		leet: "BA11A7"
    	},
    	{
    		word: "balled",
    		leet: "BA11ED"
    	},
    	{
    		word: "ballet",
    		leet: "BA11E7"
    	},
    	{
    		word: "ballot",
    		leet: "BA1107"
    	},
    	{
    		word: "baloch",
    		leet: "BA10C4"
    	},
    	{
    		word: "balolo",
    		leet: "BA1010"
    	},
    	{
    		word: "balsas",
    		leet: "BA15A5"
    	},
    	{
    		word: "baltei",
    		leet: "BA17E1"
    	},
    	{
    		word: "baltic",
    		leet: "BA171C"
    	},
    	{
    		word: "baltis",
    		leet: "BA1715"
    	},
    	{
    		word: "baobab",
    		leet: "BA0BAB"
    	},
    	{
    		word: "basale",
    		leet: "BA5A1E"
    	},
    	{
    		word: "basalt",
    		leet: "BA5A17"
    	},
    	{
    		word: "basest",
    		leet: "BA5E57"
    	},
    	{
    		word: "bashed",
    		leet: "BA54ED"
    	},
    	{
    		word: "bashes",
    		leet: "BA54E5"
    	},
    	{
    		word: "basial",
    		leet: "BA51A1"
    	},
    	{
    		word: "basics",
    		leet: "BA51C5"
    	},
    	{
    		word: "basils",
    		leet: "BA5115"
    	},
    	{
    		word: "basoga",
    		leet: "BA506A"
    	},
    	{
    		word: "basoid",
    		leet: "BA501D"
    	},
    	{
    		word: "basote",
    		leet: "BA507E"
    	},
    	{
    		word: "basses",
    		leet: "BA55E5"
    	},
    	{
    		word: "basset",
    		leet: "BA55E7"
    	},
    	{
    		word: "bassia",
    		leet: "BA551A"
    	},
    	{
    		word: "bassie",
    		leet: "BA551E"
    	},
    	{
    		word: "bassos",
    		leet: "BA5505"
    	},
    	{
    		word: "basted",
    		leet: "BA57ED"
    	},
    	{
    		word: "bastes",
    		leet: "BA57E5"
    	},
    	{
    		word: "batata",
    		leet: "BA7A7A"
    	},
    	{
    		word: "batell",
    		leet: "BA7E11"
    	},
    	{
    		word: "batete",
    		leet: "BA7E7E"
    	},
    	{
    		word: "bathed",
    		leet: "BA74ED"
    	},
    	{
    		word: "bathes",
    		leet: "BA74E5"
    	},
    	{
    		word: "bathic",
    		leet: "BA741C"
    	},
    	{
    		word: "bathos",
    		leet: "BA7405"
    	},
    	{
    		word: "batlet",
    		leet: "BA71E7"
    	},
    	{
    		word: "batoid",
    		leet: "BA701D"
    	},
    	{
    		word: "batted",
    		leet: "BA77ED"
    	},
    	{
    		word: "battel",
    		leet: "BA77E1"
    	},
    	{
    		word: "battle",
    		leet: "BA771E"
    	},
    	{
    		word: "bazoos",
    		leet: "BA2005"
    	},
    	{
    		word: "beaded",
    		leet: "BEADED"
    	},
    	{
    		word: "beadle",
    		leet: "BEAD1E"
    	},
    	{
    		word: "beagle",
    		leet: "BEA61E"
    	},
    	{
    		word: "beasts",
    		leet: "BEA575"
    	},
    	{
    		word: "beatae",
    		leet: "BEA7AE"
    	},
    	{
    		word: "beatas",
    		leet: "BEA7A5"
    	},
    	{
    		word: "beatee",
    		leet: "BEA7EE"
    	},
    	{
    		word: "bebait",
    		leet: "BEBA17"
    	},
    	{
    		word: "bebite",
    		leet: "BEB17E"
    	},
    	{
    		word: "bebled",
    		leet: "BEB1ED"
    	},
    	{
    		word: "beblot",
    		leet: "BEB107"
    	},
    	{
    		word: "beboss",
    		leet: "BEB055"
    	},
    	{
    		word: "becall",
    		leet: "BECA11"
    	},
    	{
    		word: "becchi",
    		leet: "BECC41"
    	},
    	{
    		word: "bechic",
    		leet: "BEC41C"
    	},
    	{
    		word: "beclad",
    		leet: "BEC1AD"
    	},
    	{
    		word: "beclog",
    		leet: "BEC106"
    	},
    	{
    		word: "becost",
    		leet: "BEC057"
    	},
    	{
    		word: "bedaff",
    		leet: "BEDAFF"
    	},
    	{
    		word: "bedash",
    		leet: "BEDA54"
    	},
    	{
    		word: "bedaze",
    		leet: "BEDA2E"
    	},
    	{
    		word: "bedded",
    		leet: "BEDDED"
    	},
    	{
    		word: "bedead",
    		leet: "BEDEAD"
    	},
    	{
    		word: "bedeaf",
    		leet: "BEDEAF"
    	},
    	{
    		word: "bedebt",
    		leet: "BEDEB7"
    	},
    	{
    		word: "bedell",
    		leet: "BEDE11"
    	},
    	{
    		word: "bedels",
    		leet: "BEDE15"
    	},
    	{
    		word: "bedolt",
    		leet: "BED017"
    	},
    	{
    		word: "bedote",
    		leet: "BED07E"
    	},
    	{
    		word: "bedsit",
    		leet: "BED517"
    	},
    	{
    		word: "beebee",
    		leet: "BEEBEE"
    	},
    	{
    		word: "beefed",
    		leet: "BEEFED"
    	},
    	{
    		word: "beeish",
    		leet: "BEE154"
    	},
    	{
    		word: "beelol",
    		leet: "BEE101"
    	},
    	{
    		word: "beetle",
    		leet: "BEE71E"
    	},
    	{
    		word: "befall",
    		leet: "BEFA11"
    	},
    	{
    		word: "befell",
    		leet: "BEFE11"
    	},
    	{
    		word: "befile",
    		leet: "BEF11E"
    	},
    	{
    		word: "befist",
    		leet: "BEF157"
    	},
    	{
    		word: "befits",
    		leet: "BEF175"
    	},
    	{
    		word: "beflag",
    		leet: "BEF1A6"
    	},
    	{
    		word: "beflea",
    		leet: "BEF1EA"
    	},
    	{
    		word: "befogs",
    		leet: "BEF065"
    	},
    	{
    		word: "befool",
    		leet: "BEF001"
    	},
    	{
    		word: "begall",
    		leet: "BE6A11"
    	},
    	{
    		word: "begash",
    		leet: "BE6A54"
    	},
    	{
    		word: "begass",
    		leet: "BE6A55"
    	},
    	{
    		word: "begats",
    		leet: "BE6A75"
    	},
    	{
    		word: "begaze",
    		leet: "BE6A2E"
    	},
    	{
    		word: "begets",
    		leet: "BE6E75"
    	},
    	{
    		word: "begged",
    		leet: "BE66ED"
    	},
    	{
    		word: "begift",
    		leet: "BE61F7"
    	},
    	{
    		word: "begild",
    		leet: "BE611D"
    	},
    	{
    		word: "beglad",
    		leet: "BE61AD"
    	},
    	{
    		word: "beglic",
    		leet: "BE611C"
    	},
    	{
    		word: "begobs",
    		leet: "BE60B5"
    	},
    	{
    		word: "behale",
    		leet: "BE4A1E"
    	},
    	{
    		word: "behalf",
    		leet: "BE4A1F"
    	},
    	{
    		word: "behead",
    		leet: "BE4EAD"
    	},
    	{
    		word: "beheld",
    		leet: "BE4E1D"
    	},
    	{
    		word: "behest",
    		leet: "BE4E57"
    	},
    	{
    		word: "behold",
    		leet: "BE401D"
    	},
    	{
    		word: "behoof",
    		leet: "BE400F"
    	},
    	{
    		word: "behoot",
    		leet: "BE4007"
    	},
    	{
    		word: "beigel",
    		leet: "BE16E1"
    	},
    	{
    		word: "beiges",
    		leet: "BE16E5"
    	},
    	{
    		word: "bejade",
    		leet: "BE9ADE"
    	},
    	{
    		word: "bejazz",
    		leet: "BE9A22"
    	},
    	{
    		word: "belace",
    		leet: "BE1ACE"
    	},
    	{
    		word: "belage",
    		leet: "BE1A6E"
    	},
    	{
    		word: "belait",
    		leet: "BE1A17"
    	},
    	{
    		word: "belash",
    		leet: "BE1A54"
    	},
    	{
    		word: "belast",
    		leet: "BE1A57"
    	},
    	{
    		word: "belate",
    		leet: "BE1A7E"
    	},
    	{
    		word: "beleaf",
    		leet: "BE1EAF"
    	},
    	{
    		word: "beleed",
    		leet: "BE1EED"
    	},
    	{
    		word: "beleft",
    		leet: "BE1EF7"
    	},
    	{
    		word: "belgae",
    		leet: "BE16AE"
    	},
    	{
    		word: "belgas",
    		leet: "BE16A5"
    	},
    	{
    		word: "belgic",
    		leet: "BE161C"
    	},
    	{
    		word: "belial",
    		leet: "BE11A1"
    	},
    	{
    		word: "belied",
    		leet: "BE11ED"
    	},
    	{
    		word: "belief",
    		leet: "BE11EF"
    	},
    	{
    		word: "belies",
    		leet: "BE11E5"
    	},
    	{
    		word: "belili",
    		leet: "BE1111"
    	},
    	{
    		word: "belite",
    		leet: "BE117E"
    	},
    	{
    		word: "belled",
    		leet: "BE11ED"
    	},
    	{
    		word: "belles",
    		leet: "BE11E5"
    	},
    	{
    		word: "bellic",
    		leet: "BE111C"
    	},
    	{
    		word: "bellis",
    		leet: "BE1115"
    	},
    	{
    		word: "beloid",
    		leet: "BE101D"
    	},
    	{
    		word: "belted",
    		leet: "BE17ED"
    	},
    	{
    		word: "beltie",
    		leet: "BE171E"
    	},
    	{
    		word: "beltis",
    		leet: "BE1715"
    	},
    	{
    		word: "bescab",
    		leet: "BE5CAB"
    	},
    	{
    		word: "besets",
    		leet: "BE5E75"
    	},
    	{
    		word: "beshag",
    		leet: "BE54A6"
    	},
    	{
    		word: "beshod",
    		leet: "BE540D"
    	},
    	{
    		word: "beside",
    		leet: "BE51DE"
    	},
    	{
    		word: "besigh",
    		leet: "BE5164"
    	},
    	{
    		word: "beslab",
    		leet: "BE51AB"
    	},
    	{
    		word: "besoil",
    		leet: "BE5011"
    	},
    	{
    		word: "besoot",
    		leet: "BE5007"
    	},
    	{
    		word: "besots",
    		leet: "BE5075"
    	},
    	{
    		word: "bessel",
    		leet: "BE55E1"
    	},
    	{
    		word: "besses",
    		leet: "BE55E5"
    	},
    	{
    		word: "bessie",
    		leet: "BE551E"
    	},
    	{
    		word: "bestab",
    		leet: "BE57AB"
    	},
    	{
    		word: "bestad",
    		leet: "BE57AD"
    	},
    	{
    		word: "bested",
    		leet: "BE57ED"
    	},
    	{
    		word: "betail",
    		leet: "BE7A11"
    	},
    	{
    		word: "betell",
    		leet: "BE7E11"
    	},
    	{
    		word: "betels",
    		leet: "BE7E15"
    	},
    	{
    		word: "bethel",
    		leet: "BE74E1"
    	},
    	{
    		word: "betide",
    		leet: "BE71DE"
    	},
    	{
    		word: "betise",
    		leet: "BE715E"
    	},
    	{
    		word: "betoil",
    		leet: "BE7011"
    	},
    	{
    		word: "betoss",
    		leet: "BE7055"
    	},
    	{
    		word: "bettas",
    		leet: "BE77A5"
    	},
    	{
    		word: "betted",
    		leet: "BE77ED"
    	},
    	{
    		word: "bezazz",
    		leet: "BE2A22"
    	},
    	{
    		word: "bezels",
    		leet: "BE2E15"
    	},
    	{
    		word: "bezils",
    		leet: "BE2115"
    	},
    	{
    		word: "bezzle",
    		leet: "BE221E"
    	},
    	{
    		word: "bhagat",
    		leet: "B4A6A7"
    	},
    	{
    		word: "bhisti",
    		leet: "B41571"
    	},
    	{
    		word: "bhoosa",
    		leet: "B4005A"
    	},
    	{
    		word: "bhoots",
    		leet: "B40075"
    	},
    	{
    		word: "bhotia",
    		leet: "B4071A"
    	},
    	{
    		word: "biacid",
    		leet: "B1AC1D"
    	},
    	{
    		word: "bialis",
    		leet: "B1A115"
    	},
    	{
    		word: "biased",
    		leet: "B1A5ED"
    	},
    	{
    		word: "biases",
    		leet: "B1A5E5"
    	},
    	{
    		word: "bibbed",
    		leet: "B1BBED"
    	},
    	{
    		word: "bibble",
    		leet: "B1BB1E"
    	},
    	{
    		word: "bibles",
    		leet: "B1B1E5"
    	},
    	{
    		word: "biblic",
    		leet: "B1B11C"
    	},
    	{
    		word: "biblos",
    		leet: "B1B105"
    	},
    	{
    		word: "bichos",
    		leet: "B1C405"
    	},
    	{
    		word: "biddie",
    		leet: "B1DD1E"
    	},
    	{
    		word: "bidets",
    		leet: "B1DE75"
    	},
    	{
    		word: "bidget",
    		leet: "B1D6E7"
    	},
    	{
    		word: "bields",
    		leet: "B1E1D5"
    	},
    	{
    		word: "bielid",
    		leet: "B1E11D"
    	},
    	{
    		word: "bietle",
    		leet: "B1E71E"
    	},
    	{
    		word: "biface",
    		leet: "B1FACE"
    	},
    	{
    		word: "biffed",
    		leet: "B1FFED"
    	},
    	{
    		word: "bifoil",
    		leet: "B1F011"
    	},
    	{
    		word: "bifold",
    		leet: "B1F01D"
    	},
    	{
    		word: "bigate",
    		leet: "B16A7E"
    	},
    	{
    		word: "biggah",
    		leet: "B166A4"
    	},
    	{
    		word: "bigged",
    		leet: "B166ED"
    	},
    	{
    		word: "biggie",
    		leet: "B1661E"
    	},
    	{
    		word: "bights",
    		leet: "B16475"
    	},
    	{
    		word: "biglot",
    		leet: "B16107"
    	},
    	{
    		word: "bigots",
    		leet: "B16075"
    	},
    	{
    		word: "bilabe",
    		leet: "B11ABE"
    	},
    	{
    		word: "bilalo",
    		leet: "B11A10"
    	},
    	{
    		word: "bilati",
    		leet: "B11A71"
    	},
    	{
    		word: "bilbie",
    		leet: "B11B1E"
    	},
    	{
    		word: "bilboa",
    		leet: "B11B0A"
    	},
    	{
    		word: "bilbos",
    		leet: "B11B05"
    	},
    	{
    		word: "bilged",
    		leet: "B116ED"
    	},
    	{
    		word: "bilges",
    		leet: "B116E5"
    	},
    	{
    		word: "bilith",
    		leet: "B11174"
    	},
    	{
    		word: "billed",
    		leet: "B111ED"
    	},
    	{
    		word: "billet",
    		leet: "B111E7"
    	},
    	{
    		word: "billie",
    		leet: "B1111E"
    	},
    	{
    		word: "billot",
    		leet: "B11107"
    	},
    	{
    		word: "bilobe",
    		leet: "B110BE"
    	},
    	{
    		word: "biofog",
    		leet: "B10F06"
    	},
    	{
    		word: "biogas",
    		leet: "B106A5"
    	},
    	{
    		word: "biosis",
    		leet: "B10515"
    	},
    	{
    		word: "biotas",
    		leet: "B107A5"
    	},
    	{
    		word: "biotic",
    		leet: "B1071C"
    	},
    	{
    		word: "bisalt",
    		leet: "B15A17"
    	},
    	{
    		word: "biscot",
    		leet: "B15C07"
    	},
    	{
    		word: "bisect",
    		leet: "B15EC7"
    	},
    	{
    		word: "bitted",
    		leet: "B177ED"
    	},
    	{
    		word: "bittie",
    		leet: "B1771E"
    	},
    	{
    		word: "bladed",
    		leet: "B1ADED"
    	},
    	{
    		word: "blades",
    		leet: "B1ADE5"
    	},
    	{
    		word: "blasia",
    		leet: "B1A51A"
    	},
    	{
    		word: "blasts",
    		leet: "B1A575"
    	},
    	{
    		word: "blatch",
    		leet: "B1A7C4"
    	},
    	{
    		word: "blatta",
    		leet: "B1A77A"
    	},
    	{
    		word: "blatti",
    		leet: "B1A771"
    	},
    	{
    		word: "blazed",
    		leet: "B1A2ED"
    	},
    	{
    		word: "blazes",
    		leet: "B1A2E5"
    	},
    	{
    		word: "bleach",
    		leet: "B1EAC4"
    	},
    	{
    		word: "bleats",
    		leet: "B1EA75"
    	},
    	{
    		word: "bleeds",
    		leet: "B1EED5"
    	},
    	{
    		word: "bleeze",
    		leet: "B1EE2E"
    	},
    	{
    		word: "blesse",
    		leet: "B1E55E"
    	},
    	{
    		word: "blethe",
    		leet: "B1E74E"
    	},
    	{
    		word: "bletia",
    		leet: "B1E71A"
    	},
    	{
    		word: "bliest",
    		leet: "B11E57"
    	},
    	{
    		word: "blight",
    		leet: "B11647"
    	},
    	{
    		word: "blites",
    		leet: "B117E5"
    	},
    	{
    		word: "blithe",
    		leet: "B1174E"
    	},
    	{
    		word: "bloats",
    		leet: "B10A75"
    	},
    	{
    		word: "bloods",
    		leet: "B100D5"
    	},
    	{
    		word: "blooie",
    		leet: "B1001E"
    	},
    	{
    		word: "blooth",
    		leet: "B10074"
    	},
    	{
    		word: "blotch",
    		leet: "B107C4"
    	},
    	{
    		word: "blotto",
    		leet: "B10770"
    	},
    	{
    		word: "boasts",
    		leet: "B0A575"
    	},
    	{
    		word: "boated",
    		leet: "B0A7ED"
    	},
    	{
    		word: "boatel",
    		leet: "B0A7E1"
    	},
    	{
    		word: "boatie",
    		leet: "B0A71E"
    	},
    	{
    		word: "bobbed",
    		leet: "B0BBED"
    	},
    	{
    		word: "bobbie",
    		leet: "B0BB1E"
    	},
    	{
    		word: "bobble",
    		leet: "B0BB1E"
    	},
    	{
    		word: "bobcat",
    		leet: "B0BCA7"
    	},
    	{
    		word: "boblet",
    		leet: "B0B1E7"
    	},
    	{
    		word: "bocage",
    		leet: "B0CA6E"
    	},
    	{
    		word: "bocces",
    		leet: "B0CCE5"
    	},
    	{
    		word: "boccia",
    		leet: "B0CC1A"
    	},
    	{
    		word: "boccie",
    		leet: "B0CC1E"
    	},
    	{
    		word: "boccis",
    		leet: "B0CC15"
    	},
    	{
    		word: "boches",
    		leet: "B0C4E5"
    	},
    	{
    		word: "bodach",
    		leet: "B0DAC4"
    	},
    	{
    		word: "boddle",
    		leet: "B0DD1E"
    	},
    	{
    		word: "bodega",
    		leet: "B0DE6A"
    	},
    	{
    		word: "bodgie",
    		leet: "B0D61E"
    	},
    	{
    		word: "bodice",
    		leet: "B0D1CE"
    	},
    	{
    		word: "bodied",
    		leet: "B0D1ED"
    	},
    	{
    		word: "bodies",
    		leet: "B0D1E5"
    	},
    	{
    		word: "boffos",
    		leet: "B0FF05"
    	},
    	{
    		word: "bogach",
    		leet: "B06AC4"
    	},
    	{
    		word: "bogged",
    		leet: "B066ED"
    	},
    	{
    		word: "boggle",
    		leet: "B0661E"
    	},
    	{
    		word: "bogies",
    		leet: "B061E5"
    	},
    	{
    		word: "bogled",
    		leet: "B061ED"
    	},
    	{
    		word: "bogles",
    		leet: "B061E5"
    	},
    	{
    		word: "boglet",
    		leet: "B061E7"
    	},
    	{
    		word: "bogota",
    		leet: "B0607A"
    	},
    	{
    		word: "boheas",
    		leet: "B04EA5"
    	},
    	{
    		word: "boidae",
    		leet: "B01DAE"
    	},
    	{
    		word: "boigid",
    		leet: "B0161D"
    	},
    	{
    		word: "boiled",
    		leet: "B011ED"
    	},
    	{
    		word: "boites",
    		leet: "B017E5"
    	},
    	{
    		word: "bojite",
    		leet: "B0917E"
    	},
    	{
    		word: "bolded",
    		leet: "B01DED"
    	},
    	{
    		word: "boldos",
    		leet: "B01D05"
    	},
    	{
    		word: "bolete",
    		leet: "B01E7E"
    	},
    	{
    		word: "boleti",
    		leet: "B01E71"
    	},
    	{
    		word: "bolide",
    		leet: "B011DE"
    	},
    	{
    		word: "bolita",
    		leet: "B0117A"
    	},
    	{
    		word: "bolled",
    		leet: "B011ED"
    	},
    	{
    		word: "boloed",
    		leet: "B010ED"
    	},
    	{
    		word: "bolted",
    		leet: "B017ED"
    	},
    	{
    		word: "boltel",
    		leet: "B017E1"
    	},
    	{
    		word: "booboo",
    		leet: "B00B00"
    	},
    	{
    		word: "boodie",
    		leet: "B00D1E"
    	},
    	{
    		word: "boodle",
    		leet: "B00D1E"
    	},
    	{
    		word: "boogie",
    		leet: "B0061E"
    	},
    	{
    		word: "boohoo",
    		leet: "B00400"
    	},
    	{
    		word: "boosts",
    		leet: "B00575"
    	},
    	{
    		word: "booted",
    		leet: "B007ED"
    	},
    	{
    		word: "bootee",
    		leet: "B007EE"
    	},
    	{
    		word: "bootes",
    		leet: "B007E5"
    	},
    	{
    		word: "booths",
    		leet: "B00745"
    	},
    	{
    		word: "bootid",
    		leet: "B0071D"
    	},
    	{
    		word: "bootie",
    		leet: "B0071E"
    	},
    	{
    		word: "bootle",
    		leet: "B0071E"
    	},
    	{
    		word: "boozed",
    		leet: "B002ED"
    	},
    	{
    		word: "boozes",
    		leet: "B002E5"
    	},
    	{
    		word: "boshas",
    		leet: "B054A5"
    	},
    	{
    		word: "boshes",
    		leet: "B054E5"
    	},
    	{
    		word: "bossed",
    		leet: "B055ED"
    	},
    	{
    		word: "bosses",
    		leet: "B055E5"
    	},
    	{
    		word: "bosset",
    		leet: "B055E7"
    	},
    	{
    		word: "bostal",
    		leet: "B057A1"
    	},
    	{
    		word: "botels",
    		leet: "B07E15"
    	},
    	{
    		word: "botete",
    		leet: "B07E7E"
    	},
    	{
    		word: "bothie",
    		leet: "B0741E"
    	},
    	{
    		word: "bottle",
    		leet: "B0771E"
    	},
    	{
    		word: "cabaho",
    		leet: "CABA40"
    	},
    	{
    		word: "cabala",
    		leet: "CABA1A"
    	},
    	{
    		word: "caball",
    		leet: "CABA11"
    	},
    	{
    		word: "cabals",
    		leet: "CABA15"
    	},
    	{
    		word: "cabasa",
    		leet: "CABA5A"
    	},
    	{
    		word: "cabbed",
    		leet: "CABBED"
    	},
    	{
    		word: "cabbie",
    		leet: "CABB1E"
    	},
    	{
    		word: "cabble",
    		leet: "CABB1E"
    	},
    	{
    		word: "cabiai",
    		leet: "CAB1A1"
    	},
    	{
    		word: "cabled",
    		leet: "CAB1ED"
    	},
    	{
    		word: "cables",
    		leet: "CAB1E5"
    	},
    	{
    		word: "cablet",
    		leet: "CAB1E7"
    	},
    	{
    		word: "cabobs",
    		leet: "CAB0B5"
    	},
    	{
    		word: "cabots",
    		leet: "CAB075"
    	},
    	{
    		word: "cacaos",
    		leet: "CACA05"
    	},
    	{
    		word: "caccia",
    		leet: "CACC1A"
    	},
    	{
    		word: "cached",
    		leet: "CAC4ED"
    	},
    	{
    		word: "caches",
    		leet: "CAC4E5"
    	},
    	{
    		word: "cachet",
    		leet: "CAC4E7"
    	},
    	{
    		word: "cachot",
    		leet: "CAC407"
    	},
    	{
    		word: "cactal",
    		leet: "CAC7A1"
    	},
    	{
    		word: "cadbit",
    		leet: "CADB17"
    	},
    	{
    		word: "cadded",
    		leet: "CADDED"
    	},
    	{
    		word: "caddie",
    		leet: "CADD1E"
    	},
    	{
    		word: "caddis",
    		leet: "CADD15"
    	},
    	{
    		word: "caddle",
    		leet: "CADD1E"
    	},
    	{
    		word: "cadets",
    		leet: "CADE75"
    	},
    	{
    		word: "cadged",
    		leet: "CAD6ED"
    	},
    	{
    		word: "cadges",
    		leet: "CAD6E5"
    	},
    	{
    		word: "cadish",
    		leet: "CAD154"
    	},
    	{
    		word: "caecal",
    		leet: "CAECA1"
    	},
    	{
    		word: "caffle",
    		leet: "CAFF1E"
    	},
    	{
    		word: "cafila",
    		leet: "CAF11A"
    	},
    	{
    		word: "cageot",
    		leet: "CA6E07"
    	},
    	{
    		word: "cahill",
    		leet: "CA4111"
    	},
    	{
    		word: "cahita",
    		leet: "CA417A"
    	},
    	{
    		word: "cahoot",
    		leet: "CA4007"
    	},
    	{
    		word: "caille",
    		leet: "CA111E"
    	},
    	{
    		word: "caisse",
    		leet: "CA155E"
    	},
    	{
    		word: "caitif",
    		leet: "CA171F"
    	},
    	{
    		word: "cajeta",
    		leet: "CA9E7A"
    	},
    	{
    		word: "cajole",
    		leet: "CA901E"
    	},
    	{
    		word: "calaba",
    		leet: "CA1ABA"
    	},
    	{
    		word: "calade",
    		leet: "CA1ADE"
    	},
    	{
    		word: "calais",
    		leet: "CA1A15"
    	},
    	{
    		word: "calash",
    		leet: "CA1A54"
    	},
    	{
    		word: "calced",
    		leet: "CA1CED"
    	},
    	{
    		word: "calces",
    		leet: "CA1CE5"
    	},
    	{
    		word: "calche",
    		leet: "CA1C4E"
    	},
    	{
    		word: "calcic",
    		leet: "CA1C1C"
    	},
    	{
    		word: "calesa",
    		leet: "CA1E5A"
    	},
    	{
    		word: "calico",
    		leet: "CA11C0"
    	},
    	{
    		word: "califs",
    		leet: "CA11F5"
    	},
    	{
    		word: "caliga",
    		leet: "CA116A"
    	},
    	{
    		word: "caligo",
    		leet: "CA1160"
    	},
    	{
    		word: "calili",
    		leet: "CA1111"
    	},
    	{
    		word: "calite",
    		leet: "CA117E"
    	},
    	{
    		word: "callas",
    		leet: "CA11A5"
    	},
    	{
    		word: "callat",
    		leet: "CA11A7"
    	},
    	{
    		word: "called",
    		leet: "CA11ED"
    	},
    	{
    		word: "calles",
    		leet: "CA11E5"
    	},
    	{
    		word: "callet",
    		leet: "CA11E7"
    	},
    	{
    		word: "callid",
    		leet: "CA111D"
    	},
    	{
    		word: "calloo",
    		leet: "CA1100"
    	},
    	{
    		word: "callot",
    		leet: "CA1107"
    	},
    	{
    		word: "calool",
    		leet: "CA1001"
    	},
    	{
    		word: "caltha",
    		leet: "CA174A"
    	},
    	{
    		word: "casaba",
    		leet: "CA5ABA"
    	},
    	{
    		word: "casabe",
    		leet: "CA5ABE"
    	},
    	{
    		word: "casate",
    		leet: "CA5A7E"
    	},
    	{
    		word: "casbah",
    		leet: "CA5BA4"
    	},
    	{
    		word: "cascol",
    		leet: "CA5C01"
    	},
    	{
    		word: "caseic",
    		leet: "CA5E1C"
    	},
    	{
    		word: "cashed",
    		leet: "CA54ED"
    	},
    	{
    		word: "cashel",
    		leet: "CA54E1"
    	},
    	{
    		word: "cashes",
    		leet: "CA54E5"
    	},
    	{
    		word: "cashoo",
    		leet: "CA5400"
    	},
    	{
    		word: "casita",
    		leet: "CA517A"
    	},
    	{
    		word: "casshe",
    		leet: "CA554E"
    	},
    	{
    		word: "cassia",
    		leet: "CA551A"
    	},
    	{
    		word: "cassie",
    		leet: "CA551E"
    	},
    	{
    		word: "cassis",
    		leet: "CA5515"
    	},
    	{
    		word: "casted",
    		leet: "CA57ED"
    	},
    	{
    		word: "castes",
    		leet: "CA57E5"
    	},
    	{
    		word: "castle",
    		leet: "CA571E"
    	},
    	{
    		word: "catalo",
    		leet: "CA7A10"
    	},
    	{
    		word: "catsos",
    		leet: "CA7505"
    	},
    	{
    		word: "catted",
    		leet: "CA77ED"
    	},
    	{
    		word: "cattie",
    		leet: "CA771E"
    	},
    	{
    		word: "cattle",
    		leet: "CA771E"
    	},
    	{
    		word: "cazibi",
    		leet: "CA21B1"
    	},
    	{
    		word: "ceased",
    		leet: "CEA5ED"
    	},
    	{
    		word: "ceases",
    		leet: "CEA5E5"
    	},
    	{
    		word: "cebell",
    		leet: "CEBE11"
    	},
    	{
    		word: "cebids",
    		leet: "CEB1D5"
    	},
    	{
    		word: "ceboid",
    		leet: "CEB01D"
    	},
    	{
    		word: "cecile",
    		leet: "CEC11E"
    	},
    	{
    		word: "cecils",
    		leet: "CEC115"
    	},
    	{
    		word: "ceibas",
    		leet: "CE1BA5"
    	},
    	{
    		word: "ceibos",
    		leet: "CE1B05"
    	},
    	{
    		word: "ceiled",
    		leet: "CE11ED"
    	},
    	{
    		word: "celebe",
    		leet: "CE1EBE"
    	},
    	{
    		word: "celebs",
    		leet: "CE1EB5"
    	},
    	{
    		word: "celiac",
    		leet: "CE11AC"
    	},
    	{
    		word: "celite",
    		leet: "CE117E"
    	},
    	{
    		word: "cellae",
    		leet: "CE11AE"
    	},
    	{
    		word: "celled",
    		leet: "CE11ED"
    	},
    	{
    		word: "cellos",
    		leet: "CE1105"
    	},
    	{
    		word: "celsia",
    		leet: "CE151A"
    	},
    	{
    		word: "celtic",
    		leet: "CE171C"
    	},
    	{
    		word: "celtis",
    		leet: "CE1715"
    	},
    	{
    		word: "cessed",
    		leet: "CE55ED"
    	},
    	{
    		word: "cesses",
    		leet: "CE55E5"
    	},
    	{
    		word: "cessio",
    		leet: "CE5510"
    	},
    	{
    		word: "cestas",
    		leet: "CE57A5"
    	},
    	{
    		word: "cestoi",
    		leet: "CE5701"
    	},
    	{
    		word: "cestos",
    		leet: "CE5705"
    	},
    	{
    		word: "chabot",
    		leet: "C4AB07"
    	},
    	{
    		word: "chacte",
    		leet: "C4AC7E"
    	},
    	{
    		word: "chaeta",
    		leet: "C4AE7A"
    	},
    	{
    		word: "chafed",
    		leet: "C4AFED"
    	},
    	{
    		word: "chafes",
    		leet: "C4AFE5"
    	},
    	{
    		word: "chaffs",
    		leet: "C4AFF5"
    	},
    	{
    		word: "chagal",
    		leet: "C4A6A1"
    	},
    	{
    		word: "chagga",
    		leet: "C4A66A"
    	},
    	{
    		word: "chaise",
    		leet: "C4A15E"
    	},
    	{
    		word: "chalah",
    		leet: "C4A1A4"
    	},
    	{
    		word: "chaleh",
    		leet: "C4A1E4"
    	},
    	{
    		word: "chalet",
    		leet: "C4A1E7"
    	},
    	{
    		word: "challa",
    		leet: "C4A11A"
    	},
    	{
    		word: "chalot",
    		leet: "C4A107"
    	},
    	{
    		word: "chalta",
    		leet: "C4A17A"
    	},
    	{
    		word: "chased",
    		leet: "C4A5ED"
    	},
    	{
    		word: "chases",
    		leet: "C4A5E5"
    	},
    	{
    		word: "chasid",
    		leet: "C4A51D"
    	},
    	{
    		word: "chasse",
    		leet: "C4A55E"
    	},
    	{
    		word: "chaste",
    		leet: "C4A57E"
    	},
    	{
    		word: "chatot",
    		leet: "C4A707"
    	},
    	{
    		word: "chatta",
    		leet: "C4A77A"
    	},
    	{
    		word: "chatti",
    		leet: "C4A771"
    	},
    	{
    		word: "cheats",
    		leet: "C4EA75"
    	},
    	{
    		word: "chebec",
    		leet: "C4EBEC"
    	},
    	{
    		word: "chebel",
    		leet: "C4EBE1"
    	},
    	{
    		word: "chebog",
    		leet: "C4EB06"
    	},
    	{
    		word: "cheese",
    		leet: "C4EE5E"
    	},
    	{
    		word: "chegoe",
    		leet: "C4E60E"
    	},
    	{
    		word: "chelae",
    		leet: "C4E1AE"
    	},
    	{
    		word: "chelas",
    		leet: "C4E1A5"
    	},
    	{
    		word: "chello",
    		leet: "C4E110"
    	},
    	{
    		word: "chesil",
    		leet: "C4E511"
    	},
    	{
    		word: "chests",
    		leet: "C4E575"
    	},
    	{
    		word: "chetah",
    		leet: "C4E7A4"
    	},
    	{
    		word: "cheths",
    		leet: "C4E745"
    	},
    	{
    		word: "chetif",
    		leet: "C4E71F"
    	},
    	{
    		word: "chibol",
    		leet: "C41B01"
    	},
    	{
    		word: "chicha",
    		leet: "C41C4A"
    	},
    	{
    		word: "chichi",
    		leet: "C41C41"
    	},
    	{
    		word: "chicle",
    		leet: "C41C1E"
    	},
    	{
    		word: "chicos",
    		leet: "C41C05"
    	},
    	{
    		word: "chicot",
    		leet: "C41C07"
    	},
    	{
    		word: "chided",
    		leet: "C41DED"
    	},
    	{
    		word: "chides",
    		leet: "C41DE5"
    	},
    	{
    		word: "chiefs",
    		leet: "C41EF5"
    	},
    	{
    		word: "chield",
    		leet: "C41E1D"
    	},
    	{
    		word: "chiels",
    		leet: "C41E15"
    	},
    	{
    		word: "chigga",
    		leet: "C4166A"
    	},
    	{
    		word: "chigoe",
    		leet: "C4160E"
    	},
    	{
    		word: "childe",
    		leet: "C411DE"
    	},
    	{
    		word: "chiles",
    		leet: "C411E5"
    	},
    	{
    		word: "chilla",
    		leet: "C4111A"
    	},
    	{
    		word: "chilli",
    		leet: "C41111"
    	},
    	{
    		word: "chillo",
    		leet: "C41110"
    	},
    	{
    		word: "chills",
    		leet: "C41115"
    	},
    	{
    		word: "chilte",
    		leet: "C4117E"
    	},
    	{
    		word: "chisel",
    		leet: "C415E1"
    	},
    	{
    		word: "chital",
    		leet: "C417A1"
    	},
    	{
    		word: "chithe",
    		leet: "C4174E"
    	},
    	{
    		word: "choate",
    		leet: "C40A7E"
    	},
    	{
    		word: "chobie",
    		leet: "C40B1E"
    	},
    	{
    		word: "chocho",
    		leet: "C40C40"
    	},
    	{
    		word: "choice",
    		leet: "C401CE"
    	},
    	{
    		word: "choile",
    		leet: "C4011E"
    	},
    	{
    		word: "choise",
    		leet: "C4015E"
    	},
    	{
    		word: "cholee",
    		leet: "C401EE"
    	},
    	{
    		word: "cholic",
    		leet: "C4011C"
    	},
    	{
    		word: "cholla",
    		leet: "C4011A"
    	},
    	{
    		word: "cholos",
    		leet: "C40105"
    	},
    	{
    		word: "choose",
    		leet: "C4005E"
    	},
    	{
    		word: "choses",
    		leet: "C405E5"
    	},
    	{
    		word: "chotts",
    		leet: "C40775"
    	},
    	{
    		word: "cibola",
    		leet: "C1B01A"
    	},
    	{
    		word: "cibols",
    		leet: "C1B015"
    	},
    	{
    		word: "cicada",
    		leet: "C1CADA"
    	},
    	{
    		word: "cicala",
    		leet: "C1CA1A"
    	},
    	{
    		word: "cicale",
    		leet: "C1CA1E"
    	},
    	{
    		word: "cigala",
    		leet: "C16A1A"
    	},
    	{
    		word: "cigale",
    		leet: "C16A1E"
    	},
    	{
    		word: "cilice",
    		leet: "C111CE"
    	},
    	{
    		word: "ciscos",
    		leet: "C15C05"
    	},
    	{
    		word: "cisele",
    		leet: "C15E1E"
    	},
    	{
    		word: "cistae",
    		leet: "C157AE"
    	},
    	{
    		word: "cisted",
    		leet: "C157ED"
    	},
    	{
    		word: "cistic",
    		leet: "C1571C"
    	},
    	{
    		word: "citess",
    		leet: "C17E55"
    	},
    	{
    		word: "citied",
    		leet: "C171ED"
    	},
    	{
    		word: "cities",
    		leet: "C171E5"
    	},
    	{
    		word: "citola",
    		leet: "C1701A"
    	},
    	{
    		word: "citole",
    		leet: "C1701E"
    	},
    	{
    		word: "clachs",
    		leet: "C1AC45"
    	},
    	{
    		word: "claith",
    		leet: "C1A174"
    	},
    	{
    		word: "clasts",
    		leet: "C1A575"
    	},
    	{
    		word: "clatch",
    		leet: "C1A7C4"
    	},
    	{
    		word: "cleach",
    		leet: "C1EAC4"
    	},
    	{
    		word: "cleats",
    		leet: "C1EA75"
    	},
    	{
    		word: "cleche",
    		leet: "C1EC4E"
    	},
    	{
    		word: "cledde",
    		leet: "C1EDDE"
    	},
    	{
    		word: "cledge",
    		leet: "C1ED6E"
    	},
    	{
    		word: "cleech",
    		leet: "C1EEC4"
    	},
    	{
    		word: "clefts",
    		leet: "C1EF75"
    	},
    	{
    		word: "cleoid",
    		leet: "C1E01D"
    	},
    	{
    		word: "cletch",
    		leet: "C1E7C4"
    	},
    	{
    		word: "cliche",
    		leet: "C11C4E"
    	},
    	{
    		word: "cliffs",
    		leet: "C11FF5"
    	},
    	{
    		word: "clifts",
    		leet: "C11F75"
    	},
    	{
    		word: "clitch",
    		leet: "C117C4"
    	},
    	{
    		word: "clites",
    		leet: "C117E5"
    	},
    	{
    		word: "clithe",
    		leet: "C1174E"
    	},
    	{
    		word: "clitia",
    		leet: "C1171A"
    	},
    	{
    		word: "clitic",
    		leet: "C1171C"
    	},
    	{
    		word: "cloaca",
    		leet: "C10ACA"
    	},
    	{
    		word: "cloche",
    		leet: "C10C4E"
    	},
    	{
    		word: "cloots",
    		leet: "C10075"
    	},
    	{
    		word: "closed",
    		leet: "C105ED"
    	},
    	{
    		word: "closes",
    		leet: "C105E5"
    	},
    	{
    		word: "closet",
    		leet: "C105E7"
    	},
    	{
    		word: "clothe",
    		leet: "C1074E"
    	},
    	{
    		word: "clotho",
    		leet: "C10740"
    	},
    	{
    		word: "cloths",
    		leet: "C10745"
    	},
    	{
    		word: "coachs",
    		leet: "C0AC45"
    	},
    	{
    		word: "coacts",
    		leet: "C0AC75"
    	},
    	{
    		word: "coaged",
    		leet: "C0A6ED"
    	},
    	{
    		word: "coagel",
    		leet: "C0A6E1"
    	},
    	{
    		word: "coaita",
    		leet: "C0A17A"
    	},
    	{
    		word: "coalas",
    		leet: "C0A1A5"
    	},
    	{
    		word: "coaled",
    		leet: "C0A1ED"
    	},
    	{
    		word: "coasts",
    		leet: "C0A575"
    	},
    	{
    		word: "coated",
    		leet: "C0A7ED"
    	},
    	{
    		word: "coatee",
    		leet: "C0A7EE"
    	},
    	{
    		word: "coatie",
    		leet: "C0A71E"
    	},
    	{
    		word: "coatis",
    		leet: "C0A715"
    	},
    	{
    		word: "cobaea",
    		leet: "C0BAEA"
    	},
    	{
    		word: "cobalt",
    		leet: "C0BA17"
    	},
    	{
    		word: "cobbed",
    		leet: "C0BBED"
    	},
    	{
    		word: "cobble",
    		leet: "C0BB1E"
    	},
    	{
    		word: "cobcab",
    		leet: "C0BCAB"
    	},
    	{
    		word: "cobego",
    		leet: "C0BE60"
    	},
    	{
    		word: "cobias",
    		leet: "C0B1A5"
    	},
    	{
    		word: "cobles",
    		leet: "C0B1E5"
    	},
    	{
    		word: "cobola",
    		leet: "C0B01A"
    	},
    	{
    		word: "coboss",
    		leet: "C0B055"
    	},
    	{
    		word: "cocash",
    		leet: "C0CA54"
    	},
    	{
    		word: "coccal",
    		leet: "C0CCA1"
    	},
    	{
    		word: "coccic",
    		leet: "C0CC1C"
    	},
    	{
    		word: "coccid",
    		leet: "C0CC1D"
    	},
    	{
    		word: "cochal",
    		leet: "C0C4A1"
    	},
    	{
    		word: "coclea",
    		leet: "C0C1EA"
    	},
    	{
    		word: "cocoas",
    		leet: "C0C0A5"
    	},
    	{
    		word: "codded",
    		leet: "C0DDED"
    	},
    	{
    		word: "coddle",
    		leet: "C0DD1E"
    	},
    	{
    		word: "codecs",
    		leet: "C0DEC5"
    	},
    	{
    		word: "codeia",
    		leet: "C0DE1A"
    	},
    	{
    		word: "codist",
    		leet: "C0D157"
    	},
    	{
    		word: "coecal",
    		leet: "C0ECA1"
    	},
    	{
    		word: "coedit",
    		leet: "C0ED17"
    	},
    	{
    		word: "coelho",
    		leet: "C0E140"
    	},
    	{
    		word: "coelia",
    		leet: "C0E11A"
    	},
    	{
    		word: "coffea",
    		leet: "C0FFEA"
    	},
    	{
    		word: "coffee",
    		leet: "C0FFEE"
    	},
    	{
    		word: "coffle",
    		leet: "C0FF1E"
    	},
    	{
    		word: "cogged",
    		leet: "C066ED"
    	},
    	{
    		word: "coggie",
    		leet: "C0661E"
    	},
    	{
    		word: "coggle",
    		leet: "C0661E"
    	},
    	{
    		word: "coghle",
    		leet: "C0641E"
    	},
    	{
    		word: "cogida",
    		leet: "C061DA"
    	},
    	{
    		word: "cogito",
    		leet: "C06170"
    	},
    	{
    		word: "cohead",
    		leet: "C04EAD"
    	},
    	{
    		word: "cohoba",
    		leet: "C040BA"
    	},
    	{
    		word: "cohogs",
    		leet: "C04065"
    	},
    	{
    		word: "cohosh",
    		leet: "C04054"
    	},
    	{
    		word: "cohost",
    		leet: "C04057"
    	},
    	{
    		word: "coifed",
    		leet: "C01FED"
    	},
    	{
    		word: "coiffe",
    		leet: "C01FFE"
    	},
    	{
    		word: "coiled",
    		leet: "C011ED"
    	},
    	{
    		word: "coital",
    		leet: "C017A1"
    	},
    	{
    		word: "colada",
    		leet: "C01ADA"
    	},
    	{
    		word: "colage",
    		leet: "C01A6E"
    	},
    	{
    		word: "colate",
    		leet: "C01A7E"
    	},
    	{
    		word: "colias",
    		leet: "C011A5"
    	},
    	{
    		word: "colics",
    		leet: "C011C5"
    	},
    	{
    		word: "colies",
    		leet: "C011E5"
    	},
    	{
    		word: "collab",
    		leet: "C011AB"
    	},
    	{
    		word: "collat",
    		leet: "C011A7"
    	},
    	{
    		word: "collet",
    		leet: "C011E7"
    	},
    	{
    		word: "collie",
    		leet: "C0111E"
    	},
    	{
    		word: "collis",
    		leet: "C01115"
    	},
    	{
    		word: "cologs",
    		leet: "C01065"
    	},
    	{
    		word: "colola",
    		leet: "C0101A"
    	},
    	{
    		word: "coloss",
    		leet: "C01055"
    	},
    	{
    		word: "colzas",
    		leet: "C012A5"
    	},
    	{
    		word: "coobah",
    		leet: "C00BA4"
    	},
    	{
    		word: "cooboo",
    		leet: "C00B00"
    	},
    	{
    		word: "coodle",
    		leet: "C00D1E"
    	},
    	{
    		word: "cooeed",
    		leet: "C00EED"
    	},
    	{
    		word: "cooees",
    		leet: "C00EE5"
    	},
    	{
    		word: "coohee",
    		leet: "C004EE"
    	},
    	{
    		word: "cooled",
    		leet: "C001ED"
    	},
    	{
    		word: "coolie",
    		leet: "C0011E"
    	},
    	{
    		word: "coolth",
    		leet: "C00174"
    	},
    	{
    		word: "cootch",
    		leet: "C007C4"
    	},
    	{
    		word: "cootie",
    		leet: "C0071E"
    	},
    	{
    		word: "coscet",
    		leet: "C05CE7"
    	},
    	{
    		word: "coseat",
    		leet: "C05EA7"
    	},
    	{
    		word: "cosech",
    		leet: "C05EC4"
    	},
    	{
    		word: "cosecs",
    		leet: "C05EC5"
    	},
    	{
    		word: "cosets",
    		leet: "C05E75"
    	},
    	{
    		word: "coshed",
    		leet: "C054ED"
    	},
    	{
    		word: "coshes",
    		leet: "C054E5"
    	},
    	{
    		word: "cosies",
    		leet: "C051E5"
    	},
    	{
    		word: "cossas",
    		leet: "C055A5"
    	},
    	{
    		word: "cosset",
    		leet: "C055E7"
    	},
    	{
    		word: "cossic",
    		leet: "C0551C"
    	},
    	{
    		word: "cossid",
    		leet: "C0551D"
    	},
    	{
    		word: "cossie",
    		leet: "C0551E"
    	},
    	{
    		word: "costae",
    		leet: "C057AE"
    	},
    	{
    		word: "costal",
    		leet: "C057A1"
    	},
    	{
    		word: "costed",
    		leet: "C057ED"
    	},
    	{
    		word: "cotele",
    		leet: "C07E1E"
    	},
    	{
    		word: "cotice",
    		leet: "C071CE"
    	},
    	{
    		word: "cotise",
    		leet: "C0715E"
    	},
    	{
    		word: "cotset",
    		leet: "C075E7"
    	},
    	{
    		word: "cottae",
    		leet: "C077AE"
    	},
    	{
    		word: "cottas",
    		leet: "C077A5"
    	},
    	{
    		word: "cotted",
    		leet: "C077ED"
    	},
    	{
    		word: "cottid",
    		leet: "C0771D"
    	},
    	{
    		word: "cozies",
    		leet: "C021E5"
    	},
    	{
    		word: "cozzes",
    		leet: "C022E5"
    	},
    	{
    		word: "csects",
    		leet: "C5EC75"
    	},
    	{
    		word: "czechs",
    		leet: "C2EC45"
    	},
    	{
    		word: "dabbed",
    		leet: "DABBED"
    	},
    	{
    		word: "dabble",
    		leet: "DABB1E"
    	},
    	{
    		word: "dablet",
    		leet: "DAB1E7"
    	},
    	{
    		word: "daboia",
    		leet: "DAB01A"
    	},
    	{
    		word: "dacelo",
    		leet: "DACE10"
    	},
    	{
    		word: "dachas",
    		leet: "DAC4A5"
    	},
    	{
    		word: "dacite",
    		leet: "DAC17E"
    	},
    	{
    		word: "dacoit",
    		leet: "DAC017"
    	},
    	{
    		word: "daddle",
    		leet: "DADD1E"
    	},
    	{
    		word: "dadoed",
    		leet: "DAD0ED"
    	},
    	{
    		word: "dadoes",
    		leet: "DAD0E5"
    	},
    	{
    		word: "daedal",
    		leet: "DAEDA1"
    	},
    	{
    		word: "daffed",
    		leet: "DAFFED"
    	},
    	{
    		word: "daffle",
    		leet: "DAFF1E"
    	},
    	{
    		word: "dagaba",
    		leet: "DA6ABA"
    	},
    	{
    		word: "dagesh",
    		leet: "DA6E54"
    	},
    	{
    		word: "dagged",
    		leet: "DA66ED"
    	},
    	{
    		word: "daggle",
    		leet: "DA661E"
    	},
    	{
    		word: "dagoba",
    		leet: "DA60BA"
    	},
    	{
    		word: "dagoes",
    		leet: "DA60E5"
    	},
    	{
    		word: "dahlia",
    		leet: "DA411A"
    	},
    	{
    		word: "daidle",
    		leet: "DA1D1E"
    	},
    	{
    		word: "daised",
    		leet: "DA15ED"
    	},
    	{
    		word: "daisee",
    		leet: "DA15EE"
    	},
    	{
    		word: "daises",
    		leet: "DA15E5"
    	},
    	{
    		word: "dalaga",
    		leet: "DA1A6A"
    	},
    	{
    		word: "dalasi",
    		leet: "DA1A51"
    	},
    	{
    		word: "daledh",
    		leet: "DA1ED4"
    	},
    	{
    		word: "daleth",
    		leet: "DA1E74"
    	},
    	{
    		word: "dallas",
    		leet: "DA11A5"
    	},
    	{
    		word: "dalles",
    		leet: "DA11E5"
    	},
    	{
    		word: "dallis",
    		leet: "DA1115"
    	},
    	{
    		word: "dashed",
    		leet: "DA54ED"
    	},
    	{
    		word: "dashee",
    		leet: "DA54EE"
    	},
    	{
    		word: "dashel",
    		leet: "DA54E1"
    	},
    	{
    		word: "dashes",
    		leet: "DA54E5"
    	},
    	{
    		word: "dassie",
    		leet: "DA551E"
    	},
    	{
    		word: "datcha",
    		leet: "DA7C4A"
    	},
    	{
    		word: "datisi",
    		leet: "DA7151"
    	},
    	{
    		word: "dattos",
    		leet: "DA7705"
    	},
    	{
    		word: "dazzle",
    		leet: "DA221E"
    	},
    	{
    		word: "dclass",
    		leet: "DC1A55"
    	},
    	{
    		word: "deasil",
    		leet: "DEA511"
    	},
    	{
    		word: "deaths",
    		leet: "DEA745"
    	},
    	{
    		word: "debase",
    		leet: "DEBA5E"
    	},
    	{
    		word: "debate",
    		leet: "DEBA7E"
    	},
    	{
    		word: "debbie",
    		leet: "DEBB1E"
    	},
    	{
    		word: "debcle",
    		leet: "DEBC1E"
    	},
    	{
    		word: "debell",
    		leet: "DEBE11"
    	},
    	{
    		word: "debile",
    		leet: "DEB11E"
    	},
    	{
    		word: "debite",
    		leet: "DEB17E"
    	},
    	{
    		word: "debits",
    		leet: "DEB175"
    	},
    	{
    		word: "deblai",
    		leet: "DEB1A1"
    	},
    	{
    		word: "debosh",
    		leet: "DEB054"
    	},
    	{
    		word: "deboss",
    		leet: "DEB055"
    	},
    	{
    		word: "debted",
    		leet: "DEB7ED"
    	},
    	{
    		word: "debtee",
    		leet: "DEB7EE"
    	},
    	{
    		word: "decade",
    		leet: "DECADE"
    	},
    	{
    		word: "decadi",
    		leet: "DECAD1"
    	},
    	{
    		word: "decals",
    		leet: "DECA15"
    	},
    	{
    		word: "decast",
    		leet: "DECA57"
    	},
    	{
    		word: "decate",
    		leet: "DECA7E"
    	},
    	{
    		word: "decede",
    		leet: "DECEDE"
    	},
    	{
    		word: "deceit",
    		leet: "DECE17"
    	},
    	{
    		word: "decess",
    		leet: "DECE55"
    	},
    	{
    		word: "decide",
    		leet: "DEC1DE"
    	},
    	{
    		word: "decile",
    		leet: "DEC11E"
    	},
    	{
    		word: "decise",
    		leet: "DEC15E"
    	},
    	{
    		word: "decoat",
    		leet: "DEC0A7"
    	},
    	{
    		word: "decoct",
    		leet: "DEC0C7"
    	},
    	{
    		word: "decode",
    		leet: "DEC0DE"
    	},
    	{
    		word: "decoic",
    		leet: "DEC01C"
    	},
    	{
    		word: "decoll",
    		leet: "DEC011"
    	},
    	{
    		word: "deeded",
    		leet: "DEEDED"
    	},
    	{
    		word: "deeses",
    		leet: "DEE5E5"
    	},
    	{
    		word: "deesis",
    		leet: "DEE515"
    	},
    	{
    		word: "deface",
    		leet: "DEFACE"
    	},
    	{
    		word: "defade",
    		leet: "DEFADE"
    	},
    	{
    		word: "defail",
    		leet: "DEFA11"
    	},
    	{
    		word: "defats",
    		leet: "DEFA75"
    	},
    	{
    		word: "defeat",
    		leet: "DEFEA7"
    	},
    	{
    		word: "defect",
    		leet: "DEFEC7"
    	},
    	{
    		word: "defeit",
    		leet: "DEFE17"
    	},
    	{
    		word: "defial",
    		leet: "DEF1A1"
    	},
    	{
    		word: "defied",
    		leet: "DEF1ED"
    	},
    	{
    		word: "defies",
    		leet: "DEF1E5"
    	},
    	{
    		word: "defile",
    		leet: "DEF11E"
    	},
    	{
    		word: "deflea",
    		leet: "DEF1EA"
    	},
    	{
    		word: "defogs",
    		leet: "DEF065"
    	},
    	{
    		word: "defoil",
    		leet: "DEF011"
    	},
    	{
    		word: "degage",
    		leet: "DE6A6E"
    	},
    	{
    		word: "degass",
    		leet: "DE6A55"
    	},
    	{
    		word: "degged",
    		leet: "DE66ED"
    	},
    	{
    		word: "degold",
    		leet: "DE601D"
    	},
    	{
    		word: "deiced",
    		leet: "DE1CED"
    	},
    	{
    		word: "deices",
    		leet: "DE1CE5"
    	},
    	{
    		word: "deific",
    		leet: "DE1F1C"
    	},
    	{
    		word: "deists",
    		leet: "DE1575"
    	},
    	{
    		word: "deject",
    		leet: "DE9EC7"
    	},
    	{
    		word: "delace",
    		leet: "DE1ACE"
    	},
    	{
    		word: "delate",
    		leet: "DE1A7E"
    	},
    	{
    		word: "delead",
    		leet: "DE1EAD"
    	},
    	{
    		word: "delete",
    		leet: "DE1E7E"
    	},
    	{
    		word: "delfts",
    		leet: "DE1F75"
    	},
    	{
    		word: "delice",
    		leet: "DE11CE"
    	},
    	{
    		word: "delict",
    		leet: "DE11C7"
    	},
    	{
    		word: "delies",
    		leet: "DE11E5"
    	},
    	{
    		word: "delist",
    		leet: "DE1157"
    	},
    	{
    		word: "deltal",
    		leet: "DE17A1"
    	},
    	{
    		word: "deltas",
    		leet: "DE17A5"
    	},
    	{
    		word: "deltic",
    		leet: "DE171C"
    	},
    	{
    		word: "desalt",
    		leet: "DE5A17"
    	},
    	{
    		word: "deseed",
    		leet: "DE5EED"
    	},
    	{
    		word: "desilt",
    		leet: "DE5117"
    	},
    	{
    		word: "desist",
    		leet: "DE5157"
    	},
    	{
    		word: "desize",
    		leet: "DE512E"
    	},
    	{
    		word: "desole",
    		leet: "DE501E"
    	},
    	{
    		word: "dessil",
    		leet: "DE5511"
    	},
    	{
    		word: "detach",
    		leet: "DE7AC4"
    	},
    	{
    		word: "detail",
    		leet: "DE7A11"
    	},
    	{
    		word: "detect",
    		leet: "DE7EC7"
    	},
    	{
    		word: "detest",
    		leet: "DE7E57"
    	},
    	{
    		word: "dhobee",
    		leet: "D40BEE"
    	},
    	{
    		word: "dhobie",
    		leet: "D40B1E"
    	},
    	{
    		word: "dhobis",
    		leet: "D40B15"
    	},
    	{
    		word: "dholes",
    		leet: "D401E5"
    	},
    	{
    		word: "dhooti",
    		leet: "D40071"
    	},
    	{
    		word: "dhotee",
    		leet: "D407EE"
    	},
    	{
    		word: "dhotis",
    		leet: "D40715"
    	},
    	{
    		word: "diable",
    		leet: "D1AB1E"
    	},
    	{
    		word: "diablo",
    		leet: "D1AB10"
    	},
    	{
    		word: "diacid",
    		leet: "D1AC1D"
    	},
    	{
    		word: "diacle",
    		leet: "D1AC1E"
    	},
    	{
    		word: "diadic",
    		leet: "D1AD1C"
    	},
    	{
    		word: "dialed",
    		leet: "D1A1ED"
    	},
    	{
    		word: "dialog",
    		leet: "D1A106"
    	},
    	{
    		word: "diazid",
    		leet: "D1A21D"
    	},
    	{
    		word: "dibase",
    		leet: "D1BA5E"
    	},
    	{
    		word: "dibbed",
    		leet: "D1BBED"
    	},
    	{
    		word: "dibble",
    		leet: "D1BB1E"
    	},
    	{
    		word: "dicast",
    		leet: "D1CA57"
    	},
    	{
    		word: "dichas",
    		leet: "D1C4A5"
    	},
    	{
    		word: "dicots",
    		leet: "D1C075"
    	},
    	{
    		word: "dictic",
    		leet: "D1C71C"
    	},
    	{
    		word: "didact",
    		leet: "D1DAC7"
    	},
    	{
    		word: "diddle",
    		leet: "D1DD1E"
    	},
    	{
    		word: "didest",
    		leet: "D1DE57"
    	},
    	{
    		word: "didies",
    		leet: "D1D1E5"
    	},
    	{
    		word: "didoes",
    		leet: "D1D0E5"
    	},
    	{
    		word: "dielec",
    		leet: "D1E1EC"
    	},
    	{
    		word: "diesel",
    		leet: "D1E5E1"
    	},
    	{
    		word: "dieses",
    		leet: "D1E5E5"
    	},
    	{
    		word: "diesis",
    		leet: "D1E515"
    	},
    	{
    		word: "dietal",
    		leet: "D1E7A1"
    	},
    	{
    		word: "dieted",
    		leet: "D1E7ED"
    	},
    	{
    		word: "dietic",
    		leet: "D1E71C"
    	},
    	{
    		word: "digest",
    		leet: "D16E57"
    	},
    	{
    		word: "digged",
    		leet: "D166ED"
    	},
    	{
    		word: "dights",
    		leet: "D16475"
    	},
    	{
    		word: "digits",
    		leet: "D16175"
    	},
    	{
    		word: "diglot",
    		leet: "D16107"
    	},
    	{
    		word: "dihalo",
    		leet: "D14A10"
    	},
    	{
    		word: "diiodo",
    		leet: "D110D0"
    	},
    	{
    		word: "dilate",
    		leet: "D11A7E"
    	},
    	{
    		word: "dildoe",
    		leet: "D11D0E"
    	},
    	{
    		word: "dildos",
    		leet: "D11D05"
    	},
    	{
    		word: "dillis",
    		leet: "D11115"
    	},
    	{
    		word: "diobol",
    		leet: "D10B01"
    	},
    	{
    		word: "diodes",
    		leet: "D10DE5"
    	},
    	{
    		word: "diodia",
    		leet: "D10D1A"
    	},
    	{
    		word: "diotic",
    		leet: "D1071C"
    	},
    	{
    		word: "disazo",
    		leet: "D15A20"
    	},
    	{
    		word: "discal",
    		leet: "D15CA1"
    	},
    	{
    		word: "disced",
    		leet: "D15CED"
    	},
    	{
    		word: "discos",
    		leet: "D15C05"
    	},
    	{
    		word: "disgig",
    		leet: "D15616"
    	},
    	{
    		word: "dished",
    		leet: "D154ED"
    	},
    	{
    		word: "dishes",
    		leet: "D154E5"
    	},
    	{
    		word: "distad",
    		leet: "D157AD"
    	},
    	{
    		word: "distal",
    		leet: "D157A1"
    	},
    	{
    		word: "distil",
    		leet: "D15711"
    	},
    	{
    		word: "ditali",
    		leet: "D17A11"
    	},
    	{
    		word: "ditted",
    		leet: "D177ED"
    	},
    	{
    		word: "dittos",
    		leet: "D17705"
    	},
    	{
    		word: "dizoic",
    		leet: "D1201C"
    	},
    	{
    		word: "djebel",
    		leet: "D9EBE1"
    	},
    	{
    		word: "djehad",
    		leet: "D9E4AD"
    	},
    	{
    		word: "djelab",
    		leet: "D9E1AB"
    	},
    	{
    		word: "djelfa",
    		leet: "D9E1FA"
    	},
    	{
    		word: "doable",
    		leet: "D0AB1E"
    	},
    	{
    		word: "doated",
    		leet: "D0A7ED"
    	},
    	{
    		word: "dobbed",
    		leet: "D0BBED"
    	},
    	{
    		word: "dobbie",
    		leet: "D0BB1E"
    	},
    	{
    		word: "dobies",
    		leet: "D0B1E5"
    	},
    	{
    		word: "doblas",
    		leet: "D0B1A5"
    	},
    	{
    		word: "docile",
    		leet: "D0C11E"
    	},
    	{
    		word: "dodded",
    		leet: "D0DDED"
    	},
    	{
    		word: "doddie",
    		leet: "D0DD1E"
    	},
    	{
    		word: "doddle",
    		leet: "D0DD1E"
    	},
    	{
    		word: "dodged",
    		leet: "D0D6ED"
    	},
    	{
    		word: "dodges",
    		leet: "D0D6E5"
    	},
    	{
    		word: "dodlet",
    		leet: "D0D1E7"
    	},
    	{
    		word: "dodoes",
    		leet: "D0D0E5"
    	},
    	{
    		word: "doffed",
    		leet: "D0FFED"
    	},
    	{
    		word: "dogate",
    		leet: "D06A7E"
    	},
    	{
    		word: "dogged",
    		leet: "D066ED"
    	},
    	{
    		word: "dogget",
    		leet: "D066E7"
    	},
    	{
    		word: "doggie",
    		leet: "D0661E"
    	},
    	{
    		word: "doggle",
    		leet: "D0661E"
    	},
    	{
    		word: "dogies",
    		leet: "D061E5"
    	},
    	{
    		word: "dogleg",
    		leet: "D061E6"
    	},
    	{
    		word: "dogtie",
    		leet: "D0671E"
    	},
    	{
    		word: "doigte",
    		leet: "D0167E"
    	},
    	{
    		word: "doiled",
    		leet: "D011ED"
    	},
    	{
    		word: "doited",
    		leet: "D017ED"
    	},
    	{
    		word: "doless",
    		leet: "D01E55"
    	},
    	{
    		word: "dolite",
    		leet: "D0117E"
    	},
    	{
    		word: "dolled",
    		leet: "D011ED"
    	},
    	{
    		word: "dollia",
    		leet: "D0111A"
    	},
    	{
    		word: "dollie",
    		leet: "D0111E"
    	},
    	{
    		word: "dolose",
    		leet: "D0105E"
    	},
    	{
    		word: "doocot",
    		leet: "D00C07"
    	},
    	{
    		word: "doodab",
    		leet: "D00DAB"
    	},
    	{
    		word: "doodad",
    		leet: "D00DAD"
    	},
    	{
    		word: "doodah",
    		leet: "D00DA4"
    	},
    	{
    		word: "doodia",
    		leet: "D00D1A"
    	},
    	{
    		word: "doodle",
    		leet: "D00D1E"
    	},
    	{
    		word: "doolee",
    		leet: "D001EE"
    	},
    	{
    		word: "doolie",
    		leet: "D0011E"
    	},
    	{
    		word: "dosadh",
    		leet: "D05AD4"
    	},
    	{
    		word: "dosage",
    		leet: "D05A6E"
    	},
    	{
    		word: "dossal",
    		leet: "D055A1"
    	},
    	{
    		word: "dossed",
    		leet: "D055ED"
    	},
    	{
    		word: "dossel",
    		leet: "D055E1"
    	},
    	{
    		word: "dosses",
    		leet: "D055E5"
    	},
    	{
    		word: "dossil",
    		leet: "D05511"
    	},
    	{
    		word: "dotage",
    		leet: "D07A6E"
    	},
    	{
    		word: "dotate",
    		leet: "D07A7E"
    	},
    	{
    		word: "dotish",
    		leet: "D07154"
    	},
    	{
    		word: "dotlet",
    		leet: "D071E7"
    	},
    	{
    		word: "dotted",
    		leet: "D077ED"
    	},
    	{
    		word: "dottel",
    		leet: "D077E1"
    	},
    	{
    		word: "dottle",
    		leet: "D0771E"
    	},
    	{
    		word: "dozzle",
    		leet: "D0221E"
    	},
    	{
    		word: "dsects",
    		leet: "D5EC75"
    	},
    	{
    		word: "eadios",
    		leet: "EAD105"
    	},
    	{
    		word: "eadish",
    		leet: "EAD154"
    	},
    	{
    		word: "eagled",
    		leet: "EA61ED"
    	},
    	{
    		word: "eagles",
    		leet: "EA61E5"
    	},
    	{
    		word: "eaglet",
    		leet: "EA61E7"
    	},
    	{
    		word: "easels",
    		leet: "EA5E15"
    	},
    	{
    		word: "easies",
    		leet: "EA51E5"
    	},
    	{
    		word: "eassel",
    		leet: "EA55E1"
    	},
    	{
    		word: "easted",
    		leet: "EA57ED"
    	},
    	{
    		word: "eatage",
    		leet: "EA7A6E"
    	},
    	{
    		word: "eatche",
    		leet: "EA7C4E"
    	},
    	{
    		word: "ebbets",
    		leet: "EBBE75"
    	},
    	{
    		word: "ebcasc",
    		leet: "EBCA5C"
    	},
    	{
    		word: "ebcdic",
    		leet: "EBCD1C"
    	},
    	{
    		word: "ecbole",
    		leet: "ECB01E"
    	},
    	{
    		word: "eccles",
    		leet: "ECC1E5"
    	},
    	{
    		word: "ecesic",
    		leet: "ECE51C"
    	},
    	{
    		word: "ecesis",
    		leet: "ECE515"
    	},
    	{
    		word: "echoed",
    		leet: "EC40ED"
    	},
    	{
    		word: "echoes",
    		leet: "EC40E5"
    	},
    	{
    		word: "echoic",
    		leet: "EC401C"
    	},
    	{
    		word: "eclats",
    		leet: "EC1A75"
    	},
    	{
    		word: "ecoles",
    		leet: "EC01E5"
    	},
    	{
    		word: "eddaic",
    		leet: "EDDA1C"
    	},
    	{
    		word: "eddied",
    		leet: "EDD1ED"
    	},
    	{
    		word: "eddies",
    		leet: "EDD1E5"
    	},
    	{
    		word: "eddish",
    		leet: "EDD154"
    	},
    	{
    		word: "eddoes",
    		leet: "EDD0E5"
    	},
    	{
    		word: "edible",
    		leet: "ED1B1E"
    	},
    	{
    		word: "edicts",
    		leet: "ED1C75"
    	},
    	{
    		word: "ediles",
    		leet: "ED11E5"
    	},
    	{
    		word: "edital",
    		leet: "ED17A1"
    	},
    	{
    		word: "edited",
    		leet: "ED17ED"
    	},
    	{
    		word: "eelbob",
    		leet: "EE1B0B"
    	},
    	{
    		word: "efface",
    		leet: "EFFACE"
    	},
    	{
    		word: "effate",
    		leet: "EFFA7E"
    	},
    	{
    		word: "effect",
    		leet: "EFFEC7"
    	},
    	{
    		word: "effete",
    		leet: "EFFE7E"
    	},
    	{
    		word: "eftest",
    		leet: "EF7E57"
    	},
    	{
    		word: "egesta",
    		leet: "E6E57A"
    	},
    	{
    		word: "egests",
    		leet: "E6E575"
    	},
    	{
    		word: "egghot",
    		leet: "E66407"
    	},
    	{
    		word: "egises",
    		leet: "E615E5"
    	},
    	{
    		word: "egoist",
    		leet: "E60157"
    	},
    	{
    		word: "egoize",
    		leet: "E6012E"
    	},
    	{
    		word: "ehlite",
    		leet: "E4117E"
    	},
    	{
    		word: "eidola",
    		leet: "E1D01A"
    	},
    	{
    		word: "eiffel",
    		leet: "E1FFE1"
    	},
    	{
    		word: "eighth",
    		leet: "E16474"
    	},
    	{
    		word: "eights",
    		leet: "E16475"
    	},
    	{
    		word: "eisell",
    		leet: "E15E11"
    	},
    	{
    		word: "ejecta",
    		leet: "E9EC7A"
    	},
    	{
    		word: "ejects",
    		leet: "E9EC75"
    	},
    	{
    		word: "ejidal",
    		leet: "E91DA1"
    	},
    	{
    		word: "ejidos",
    		leet: "E91D05"
    	},
    	{
    		word: "elaeis",
    		leet: "E1AE15"
    	},
    	{
    		word: "elated",
    		leet: "E1A7ED"
    	},
    	{
    		word: "elates",
    		leet: "E1A7E5"
    	},
    	{
    		word: "elatha",
    		leet: "E1A74A"
    	},
    	{
    		word: "elboic",
    		leet: "E1B01C"
    	},
    	{
    		word: "elcaja",
    		leet: "E1CA9A"
    	},
    	{
    		word: "elchee",
    		leet: "E1C4EE"
    	},
    	{
    		word: "eldest",
    		leet: "E1DE57"
    	},
    	{
    		word: "elechi",
    		leet: "E1EC41"
    	},
    	{
    		word: "electo",
    		leet: "E1EC70"
    	},
    	{
    		word: "elects",
    		leet: "E1EC75"
    	},
    	{
    		word: "elegit",
    		leet: "E1E617"
    	},
    	{
    		word: "elfish",
    		leet: "E1F154"
    	},
    	{
    		word: "elicit",
    		leet: "E11C17"
    	},
    	{
    		word: "elided",
    		leet: "E11DED"
    	},
    	{
    		word: "elides",
    		leet: "E11DE5"
    	},
    	{
    		word: "elijah",
    		leet: "E119A4"
    	},
    	{
    		word: "elisha",
    		leet: "E1154A"
    	},
    	{
    		word: "elissa",
    		leet: "E1155A"
    	},
    	{
    		word: "elites",
    		leet: "E117E5"
    	},
    	{
    		word: "ellice",
    		leet: "E111CE"
    	},
    	{
    		word: "elliot",
    		leet: "E11107"
    	},
    	{
    		word: "elodea",
    		leet: "E10DEA"
    	},
    	{
    		word: "elodes",
    		leet: "E10DE5"
    	},
    	{
    		word: "eloise",
    		leet: "E1015E"
    	},
    	{
    		word: "eogaea",
    		leet: "E06AEA"
    	},
    	{
    		word: "eoiths",
    		leet: "E01745"
    	},
    	{
    		word: "eolith",
    		leet: "E01174"
    	},
    	{
    		word: "eosate",
    		leet: "E05A7E"
    	},
    	{
    		word: "eoside",
    		leet: "E051DE"
    	},
    	{
    		word: "eozoic",
    		leet: "E0201C"
    	},
    	{
    		word: "eschel",
    		leet: "E5C4E1"
    	},
    	{
    		word: "escoba",
    		leet: "E5C0BA"
    	},
    	{
    		word: "escots",
    		leet: "E5C075"
    	},
    	{
    		word: "esodic",
    		leet: "E50D1C"
    	},
    	{
    		word: "esseda",
    		leet: "E55EDA"
    	},
    	{
    		word: "essede",
    		leet: "E55EDE"
    	},
    	{
    		word: "estado",
    		leet: "E57AD0"
    	},
    	{
    		word: "estafa",
    		leet: "E57AFA"
    	},
    	{
    		word: "estall",
    		leet: "E57A11"
    	},
    	{
    		word: "estate",
    		leet: "E57A7E"
    	},
    	{
    		word: "estats",
    		leet: "E57A75"
    	},
    	{
    		word: "estocs",
    		leet: "E570C5"
    	},
    	{
    		word: "estoil",
    		leet: "E57011"
    	},
    	{
    		word: "etched",
    		leet: "E7C4ED"
    	},
    	{
    		word: "etches",
    		leet: "E7C4E5"
    	},
    	{
    		word: "ethics",
    		leet: "E741C5"
    	},
    	{
    		word: "ethide",
    		leet: "E741DE"
    	},
    	{
    		word: "ethize",
    		leet: "E7412E"
    	},
    	{
    		word: "etoffe",
    		leet: "E70FFE"
    	},
    	{
    		word: "etoile",
    		leet: "E7011E"
    	},
    	{
    		word: "ettled",
    		leet: "E771ED"
    	},
    	{
    		word: "fabled",
    		leet: "FAB1ED"
    	},
    	{
    		word: "fables",
    		leet: "FAB1E5"
    	},
    	{
    		word: "facade",
    		leet: "FACADE"
    	},
    	{
    		word: "facete",
    		leet: "FACE7E"
    	},
    	{
    		word: "facets",
    		leet: "FACE75"
    	},
    	{
    		word: "facial",
    		leet: "FAC1A1"
    	},
    	{
    		word: "facias",
    		leet: "FAC1A5"
    	},
    	{
    		word: "facies",
    		leet: "FAC1E5"
    	},
    	{
    		word: "facile",
    		leet: "FAC11E"
    	},
    	{
    		word: "faddle",
    		leet: "FADD1E"
    	},
    	{
    		word: "fadged",
    		leet: "FAD6ED"
    	},
    	{
    		word: "fadges",
    		leet: "FAD6E5"
    	},
    	{
    		word: "faecal",
    		leet: "FAECA1"
    	},
    	{
    		word: "faeces",
    		leet: "FAECE5"
    	},
    	{
    		word: "faffle",
    		leet: "FAFF1E"
    	},
    	{
    		word: "fagald",
    		leet: "FA6A1D"
    	},
    	{
    		word: "fagged",
    		leet: "FA66ED"
    	},
    	{
    		word: "faggot",
    		leet: "FA6607"
    	},
    	{
    		word: "fagots",
    		leet: "FA6075"
    	},
    	{
    		word: "fagott",
    		leet: "FA6077"
    	},
    	{
    		word: "failed",
    		leet: "FA11ED"
    	},
    	{
    		word: "faille",
    		leet: "FA111E"
    	},
    	{
    		word: "faiths",
    		leet: "FA1745"
    	},
    	{
    		word: "falces",
    		leet: "FA1CE5"
    	},
    	{
    		word: "fallal",
    		leet: "FA11A1"
    	},
    	{
    		word: "falsie",
    		leet: "FA151E"
    	},
    	{
    		word: "fasces",
    		leet: "FA5CE5"
    	},
    	{
    		word: "fascet",
    		leet: "FA5CE7"
    	},
    	{
    		word: "fascia",
    		leet: "FA5C1A"
    	},
    	{
    		word: "fascio",
    		leet: "FA5C10"
    	},
    	{
    		word: "fascis",
    		leet: "FA5C15"
    	},
    	{
    		word: "fasels",
    		leet: "FA5E15"
    	},
    	{
    		word: "fashed",
    		leet: "FA54ED"
    	},
    	{
    		word: "fashes",
    		leet: "FA54E5"
    	},
    	{
    		word: "fasola",
    		leet: "FA501A"
    	},
    	{
    		word: "fasted",
    		leet: "FA57ED"
    	},
    	{
    		word: "fatale",
    		leet: "FA7A1E"
    	},
    	{
    		word: "fatals",
    		leet: "FA7A15"
    	},
    	{
    		word: "fatiha",
    		leet: "FA714A"
    	},
    	{
    		word: "fatsia",
    		leet: "FA751A"
    	},
    	{
    		word: "fatsos",
    		leet: "FA7505"
    	},
    	{
    		word: "fatted",
    		leet: "FA77ED"
    	},
    	{
    		word: "feased",
    		leet: "FEA5ED"
    	},
    	{
    		word: "feases",
    		leet: "FEA5E5"
    	},
    	{
    		word: "feasts",
    		leet: "FEA575"
    	},
    	{
    		word: "feazed",
    		leet: "FEA2ED"
    	},
    	{
    		word: "feazes",
    		leet: "FEA2E5"
    	},
    	{
    		word: "fecche",
    		leet: "FECC4E"
    	},
    	{
    		word: "fecial",
    		leet: "FEC1A1"
    	},
    	{
    		word: "feeble",
    		leet: "FEEB1E"
    	},
    	{
    		word: "feeded",
    		leet: "FEEDED"
    	},
    	{
    		word: "feezed",
    		leet: "FEE2ED"
    	},
    	{
    		word: "feezes",
    		leet: "FEE2E5"
    	},
    	{
    		word: "feijoa",
    		leet: "FE190A"
    	},
    	{
    		word: "feists",
    		leet: "FE1575"
    	},
    	{
    		word: "felids",
    		leet: "FE11D5"
    	},
    	{
    		word: "fellah",
    		leet: "FE11A4"
    	},
    	{
    		word: "fellas",
    		leet: "FE11A5"
    	},
    	{
    		word: "felled",
    		leet: "FE11ED"
    	},
    	{
    		word: "fellic",
    		leet: "FE111C"
    	},
    	{
    		word: "felloe",
    		leet: "FE110E"
    	},
    	{
    		word: "feloid",
    		leet: "FE101D"
    	},
    	{
    		word: "felsic",
    		leet: "FE151C"
    	},
    	{
    		word: "felted",
    		leet: "FE17ED"
    	},
    	{
    		word: "feodal",
    		leet: "FE0DA1"
    	},
    	{
    		word: "feoffs",
    		leet: "FE0FF5"
    	},
    	{
    		word: "fesels",
    		leet: "FE5E15"
    	},
    	{
    		word: "fessed",
    		leet: "FE55ED"
    	},
    	{
    		word: "fesses",
    		leet: "FE55E5"
    	},
    	{
    		word: "festae",
    		leet: "FE57AE"
    	},
    	{
    		word: "festal",
    		leet: "FE57A1"
    	},
    	{
    		word: "fetial",
    		leet: "FE71A1"
    	},
    	{
    		word: "fetich",
    		leet: "FE71C4"
    	},
    	{
    		word: "fetise",
    		leet: "FE715E"
    	},
    	{
    		word: "fetish",
    		leet: "FE7154"
    	},
    	{
    		word: "fetted",
    		leet: "FE77ED"
    	},
    	{
    		word: "fettle",
    		leet: "FE771E"
    	},
    	{
    		word: "fezzed",
    		leet: "FE22ED"
    	},
    	{
    		word: "fezzes",
    		leet: "FE22E5"
    	},
    	{
    		word: "fiasco",
    		leet: "F1A5C0"
    	},
    	{
    		word: "fibbed",
    		leet: "F1BBED"
    	},
    	{
    		word: "ficche",
    		leet: "F1CC4E"
    	},
    	{
    		word: "fichat",
    		leet: "F1C4A7"
    	},
    	{
    		word: "fiches",
    		leet: "F1C4E5"
    	},
    	{
    		word: "ficoes",
    		leet: "F1C0E5"
    	},
    	{
    		word: "ficoid",
    		leet: "F1C01D"
    	},
    	{
    		word: "fictil",
    		leet: "F1C711"
    	},
    	{
    		word: "fidate",
    		leet: "F1DA7E"
    	},
    	{
    		word: "fidded",
    		leet: "F1DDED"
    	},
    	{
    		word: "fiddle",
    		leet: "F1DD1E"
    	},
    	{
    		word: "fidele",
    		leet: "F1DE1E"
    	},
    	{
    		word: "fideos",
    		leet: "F1DE05"
    	},
    	{
    		word: "fidfad",
    		leet: "F1DFAD"
    	},
    	{
    		word: "fidged",
    		leet: "F1D6ED"
    	},
    	{
    		word: "fidges",
    		leet: "F1D6E5"
    	},
    	{
    		word: "fidget",
    		leet: "F1D6E7"
    	},
    	{
    		word: "fields",
    		leet: "F1E1D5"
    	},
    	{
    		word: "fiesta",
    		leet: "F1E57A"
    	},
    	{
    		word: "fifish",
    		leet: "F1F154"
    	},
    	{
    		word: "fifths",
    		leet: "F1F745"
    	},
    	{
    		word: "figged",
    		leet: "F166ED"
    	},
    	{
    		word: "figgle",
    		leet: "F1661E"
    	},
    	{
    		word: "fights",
    		leet: "F16475"
    	},
    	{
    		word: "filace",
    		leet: "F11ACE"
    	},
    	{
    		word: "filago",
    		leet: "F11A60"
    	},
    	{
    		word: "filate",
    		leet: "F11A7E"
    	},
    	{
    		word: "filaze",
    		leet: "F11A2E"
    	},
    	{
    		word: "filets",
    		leet: "F11E75"
    	},
    	{
    		word: "filial",
    		leet: "F111A1"
    	},
    	{
    		word: "filite",
    		leet: "F1117E"
    	},
    	{
    		word: "filled",
    		leet: "F111ED"
    	},
    	{
    		word: "filles",
    		leet: "F111E5"
    	},
    	{
    		word: "fillet",
    		leet: "F111E7"
    	},
    	{
    		word: "filosa",
    		leet: "F1105A"
    	},
    	{
    		word: "filose",
    		leet: "F1105E"
    	},
    	{
    		word: "filths",
    		leet: "F11745"
    	},
    	{
    		word: "fiscal",
    		leet: "F15CA1"
    	},
    	{
    		word: "fished",
    		leet: "F154ED"
    	},
    	{
    		word: "fishes",
    		leet: "F154E5"
    	},
    	{
    		word: "fishet",
    		leet: "F154E7"
    	},
    	{
    		word: "fissle",
    		leet: "F1551E"
    	},
    	{
    		word: "fisted",
    		leet: "F157ED"
    	},
    	{
    		word: "fistic",
    		leet: "F1571C"
    	},
    	{
    		word: "fistle",
    		leet: "F1571E"
    	},
    	{
    		word: "fitche",
    		leet: "F17C4E"
    	},
    	{
    		word: "fitted",
    		leet: "F177ED"
    	},
    	{
    		word: "fittit",
    		leet: "F17717"
    	},
    	{
    		word: "fizgig",
    		leet: "F12616"
    	},
    	{
    		word: "fizzed",
    		leet: "F122ED"
    	},
    	{
    		word: "fizzes",
    		leet: "F122E5"
    	},
    	{
    		word: "fizzle",
    		leet: "F1221E"
    	},
    	{
    		word: "fjelds",
    		leet: "F9E1D5"
    	},
    	{
    		word: "flabel",
    		leet: "F1ABE1"
    	},
    	{
    		word: "flails",
    		leet: "F1A115"
    	},
    	{
    		word: "flaite",
    		leet: "F1A17E"
    	},
    	{
    		word: "flaith",
    		leet: "F1A174"
    	},
    	{
    		word: "flated",
    		leet: "F1A7ED"
    	},
    	{
    		word: "flathe",
    		leet: "F1A74E"
    	},
    	{
    		word: "fleche",
    		leet: "F1EC4E"
    	},
    	{
    		word: "fledge",
    		leet: "F1ED6E"
    	},
    	{
    		word: "fleece",
    		leet: "F1EECE"
    	},
    	{
    		word: "fleech",
    		leet: "F1EEC4"
    	},
    	{
    		word: "fleets",
    		leet: "F1EE75"
    	},
    	{
    		word: "fletch",
    		leet: "F1E7C4"
    	},
    	{
    		word: "flidge",
    		leet: "F11D6E"
    	},
    	{
    		word: "fliest",
    		leet: "F11E57"
    	},
    	{
    		word: "flight",
    		leet: "F11647"
    	},
    	{
    		word: "flitch",
    		leet: "F117C4"
    	},
    	{
    		word: "flited",
    		leet: "F117ED"
    	},
    	{
    		word: "flites",
    		leet: "F117E5"
    	},
    	{
    		word: "floats",
    		leet: "F10A75"
    	},
    	{
    		word: "flocci",
    		leet: "F10CC1"
    	},
    	{
    		word: "flodge",
    		leet: "F10D6E"
    	},
    	{
    		word: "floods",
    		leet: "F100D5"
    	},
    	{
    		word: "flossa",
    		leet: "F1055A"
    	},
    	{
    		word: "flotas",
    		leet: "F107A5"
    	},
    	{
    		word: "foaled",
    		leet: "F0A1ED"
    	},
    	{
    		word: "fobbed",
    		leet: "F0BBED"
    	},
    	{
    		word: "focsle",
    		leet: "F0C51E"
    	},
    	{
    		word: "fodgel",
    		leet: "F0D6E1"
    	},
    	{
    		word: "foeish",
    		leet: "F0E154"
    	},
    	{
    		word: "foetal",
    		leet: "F0E7A1"
    	},
    	{
    		word: "foetid",
    		leet: "F0E71D"
    	},
    	{
    		word: "fogdog",
    		leet: "F06D06"
    	},
    	{
    		word: "fogged",
    		leet: "F066ED"
    	},
    	{
    		word: "fogies",
    		leet: "F061E5"
    	},
    	{
    		word: "foible",
    		leet: "F01B1E"
    	},
    	{
    		word: "foiled",
    		leet: "F011ED"
    	},
    	{
    		word: "foists",
    		leet: "F01575"
    	},
    	{
    		word: "folate",
    		leet: "F01A7E"
    	},
    	{
    		word: "folded",
    		leet: "F01DED"
    	},
    	{
    		word: "folial",
    		leet: "F011A1"
    	},
    	{
    		word: "folies",
    		leet: "F011E5"
    	},
    	{
    		word: "folios",
    		leet: "F01105"
    	},
    	{
    		word: "foliot",
    		leet: "F01107"
    	},
    	{
    		word: "folles",
    		leet: "F011E5"
    	},
    	{
    		word: "follis",
    		leet: "F01115"
    	},
    	{
    		word: "fooled",
    		leet: "F001ED"
    	},
    	{
    		word: "footed",
    		leet: "F007ED"
    	},
    	{
    		word: "footie",
    		leet: "F0071E"
    	},
    	{
    		word: "footle",
    		leet: "F0071E"
    	},
    	{
    		word: "foozle",
    		leet: "F0021E"
    	},
    	{
    		word: "fosite",
    		leet: "F0517E"
    	},
    	{
    		word: "fossae",
    		leet: "F055AE"
    	},
    	{
    		word: "fossed",
    		leet: "F055ED"
    	},
    	{
    		word: "fosses",
    		leet: "F055E5"
    	},
    	{
    		word: "fosset",
    		leet: "F055E7"
    	},
    	{
    		word: "fossil",
    		leet: "F05511"
    	},
    	{
    		word: "fsiest",
    		leet: "F51E57"
    	},
    	{
    		word: "gaatch",
    		leet: "6AA7C4"
    	},
    	{
    		word: "gabbai",
    		leet: "6ABBA1"
    	},
    	{
    		word: "gabbed",
    		leet: "6ABBED"
    	},
    	{
    		word: "gabble",
    		leet: "6ABB1E"
    	},
    	{
    		word: "gabgab",
    		leet: "6AB6AB"
    	},
    	{
    		word: "gabies",
    		leet: "6AB1E5"
    	},
    	{
    		word: "gabled",
    		leet: "6AB1ED"
    	},
    	{
    		word: "gables",
    		leet: "6AB1E5"
    	},
    	{
    		word: "gablet",
    		leet: "6AB1E7"
    	},
    	{
    		word: "gadaba",
    		leet: "6ADABA"
    	},
    	{
    		word: "gadaea",
    		leet: "6ADAEA"
    	},
    	{
    		word: "gadbee",
    		leet: "6ADBEE"
    	},
    	{
    		word: "gadded",
    		leet: "6ADDED"
    	},
    	{
    		word: "gaddis",
    		leet: "6ADD15"
    	},
    	{
    		word: "gadget",
    		leet: "6AD6E7"
    	},
    	{
    		word: "gadids",
    		leet: "6AD1D5"
    	},
    	{
    		word: "gadite",
    		leet: "6AD17E"
    	},
    	{
    		word: "gadoid",
    		leet: "6AD01D"
    	},
    	{
    		word: "gaelic",
    		leet: "6AE11C"
    	},
    	{
    		word: "gaffed",
    		leet: "6AFFED"
    	},
    	{
    		word: "gaffes",
    		leet: "6AFFE5"
    	},
    	{
    		word: "gaffle",
    		leet: "6AFF1E"
    	},
    	{
    		word: "gagate",
    		leet: "6A6A7E"
    	},
    	{
    		word: "gagged",
    		leet: "6A66ED"
    	},
    	{
    		word: "gaggle",
    		leet: "6A661E"
    	},
    	{
    		word: "gaited",
    		leet: "6A17ED"
    	},
    	{
    		word: "galago",
    		leet: "6A1A60"
    	},
    	{
    		word: "galahs",
    		leet: "6A1A45"
    	},
    	{
    		word: "galcha",
    		leet: "6A1C4A"
    	},
    	{
    		word: "galeae",
    		leet: "6A1EAE"
    	},
    	{
    		word: "galeas",
    		leet: "6A1EA5"
    	},
    	{
    		word: "galega",
    		leet: "6A1E6A"
    	},
    	{
    		word: "galeid",
    		leet: "6A1E1D"
    	},
    	{
    		word: "galeod",
    		leet: "6A1E0D"
    	},
    	{
    		word: "galgal",
    		leet: "6A16A1"
    	},
    	{
    		word: "galibi",
    		leet: "6A11B1"
    	},
    	{
    		word: "galiot",
    		leet: "6A1107"
    	},
    	{
    		word: "gallah",
    		leet: "6A11A4"
    	},
    	{
    		word: "galled",
    		leet: "6A11ED"
    	},
    	{
    		word: "gallet",
    		leet: "6A11E7"
    	},
    	{
    		word: "gallic",
    		leet: "6A111C"
    	},
    	{
    		word: "galoch",
    		leet: "6A10C4"
    	},
    	{
    		word: "galoot",
    		leet: "6A1007"
    	},
    	{
    		word: "galosh",
    		leet: "6A1054"
    	},
    	{
    		word: "gaoled",
    		leet: "6A01ED"
    	},
    	{
    		word: "gasbag",
    		leet: "6A5BA6"
    	},
    	{
    		word: "gashed",
    		leet: "6A54ED"
    	},
    	{
    		word: "gashes",
    		leet: "6A54E5"
    	},
    	{
    		word: "gaslit",
    		leet: "6A5117"
    	},
    	{
    		word: "gassed",
    		leet: "6A55ED"
    	},
    	{
    		word: "gasses",
    		leet: "6A55E5"
    	},
    	{
    		word: "gassit",
    		leet: "6A5517"
    	},
    	{
    		word: "gasted",
    		leet: "6A57ED"
    	},
    	{
    		word: "gathic",
    		leet: "6A741C"
    	},
    	{
    		word: "gazabo",
    		leet: "6A2AB0"
    	},
    	{
    		word: "gazebo",
    		leet: "6A2EB0"
    	},
    	{
    		word: "geatas",
    		leet: "6EA7A5"
    	},
    	{
    		word: "gebbie",
    		leet: "6EBB1E"
    	},
    	{
    		word: "gedact",
    		leet: "6EDAC7"
    	},
    	{
    		word: "geejee",
    		leet: "6EE9EE"
    	},
    	{
    		word: "geests",
    		leet: "6EE575"
    	},
    	{
    		word: "geggee",
    		leet: "6E66EE"
    	},
    	{
    		word: "geisha",
    		leet: "6E154A"
    	},
    	{
    		word: "gelada",
    		leet: "6E1ADA"
    	},
    	{
    		word: "gelate",
    		leet: "6E1A7E"
    	},
    	{
    		word: "gelded",
    		leet: "6E1DED"
    	},
    	{
    		word: "gelees",
    		leet: "6E1EE5"
    	},
    	{
    		word: "gelled",
    		leet: "6E11ED"
    	},
    	{
    		word: "gelose",
    		leet: "6E105E"
    	},
    	{
    		word: "geodal",
    		leet: "6E0DA1"
    	},
    	{
    		word: "geodes",
    		leet: "6E0DE5"
    	},
    	{
    		word: "geodic",
    		leet: "6E0D1C"
    	},
    	{
    		word: "geoids",
    		leet: "6E01D5"
    	},
    	{
    		word: "geosid",
    		leet: "6E051D"
    	},
    	{
    		word: "geotic",
    		leet: "6E071C"
    	},
    	{
    		word: "gesith",
    		leet: "6E5174"
    	},
    	{
    		word: "gestae",
    		leet: "6E57AE"
    	},
    	{
    		word: "gested",
    		leet: "6E57ED"
    	},
    	{
    		word: "gestes",
    		leet: "6E57E5"
    	},
    	{
    		word: "gestic",
    		leet: "6E571C"
    	},
    	{
    		word: "gestio",
    		leet: "6E5710"
    	},
    	{
    		word: "ghaist",
    		leet: "64A157"
    	},
    	{
    		word: "ghatti",
    		leet: "64A771"
    	},
    	{
    		word: "ghazal",
    		leet: "64A2A1"
    	},
    	{
    		word: "ghazel",
    		leet: "64A2E1"
    	},
    	{
    		word: "ghazis",
    		leet: "64A215"
    	},
    	{
    		word: "ghedda",
    		leet: "64EDDA"
    	},
    	{
    		word: "ghetti",
    		leet: "64E771"
    	},
    	{
    		word: "ghetto",
    		leet: "64E770"
    	},
    	{
    		word: "ghibli",
    		leet: "641B11"
    	},
    	{
    		word: "ghosts",
    		leet: "640575"
    	},
    	{
    		word: "gibbed",
    		leet: "61BBED"
    	},
    	{
    		word: "gibbet",
    		leet: "61BBE7"
    	},
    	{
    		word: "gibbol",
    		leet: "61BB01"
    	},
    	{
    		word: "gibleh",
    		leet: "61B1E4"
    	},
    	{
    		word: "giblet",
    		leet: "61B1E7"
    	},
    	{
    		word: "giboia",
    		leet: "61B01A"
    	},
    	{
    		word: "giddea",
    		leet: "61DDEA"
    	},
    	{
    		word: "gidgea",
    		leet: "61D6EA"
    	},
    	{
    		word: "gidgee",
    		leet: "61D6EE"
    	},
    	{
    		word: "gidjee",
    		leet: "61D9EE"
    	},
    	{
    		word: "giesel",
    		leet: "61E5E1"
    	},
    	{
    		word: "gifola",
    		leet: "61F01A"
    	},
    	{
    		word: "gifted",
    		leet: "61F7ED"
    	},
    	{
    		word: "giftie",
    		leet: "61F71E"
    	},
    	{
    		word: "gigged",
    		leet: "6166ED"
    	},
    	{
    		word: "gigget",
    		leet: "6166E7"
    	},
    	{
    		word: "giggit",
    		leet: "616617"
    	},
    	{
    		word: "giggle",
    		leet: "61661E"
    	},
    	{
    		word: "giglet",
    		leet: "6161E7"
    	},
    	{
    		word: "giglio",
    		leet: "616110"
    	},
    	{
    		word: "giglot",
    		leet: "616107"
    	},
    	{
    		word: "gigolo",
    		leet: "616010"
    	},
    	{
    		word: "gigots",
    		leet: "616075"
    	},
    	{
    		word: "gilded",
    		leet: "611DED"
    	},
    	{
    		word: "gilgai",
    		leet: "6116A1"
    	},
    	{
    		word: "gilgie",
    		leet: "61161E"
    	},
    	{
    		word: "gilled",
    		leet: "6111ED"
    	},
    	{
    		word: "gilles",
    		leet: "6111E5"
    	},
    	{
    		word: "gillie",
    		leet: "61111E"
    	},
    	{
    		word: "gillot",
    		leet: "611107"
    	},
    	{
    		word: "glaces",
    		leet: "61ACE5"
    	},
    	{
    		word: "glacis",
    		leet: "61AC15"
    	},
    	{
    		word: "glades",
    		leet: "61ADE5"
    	},
    	{
    		word: "gladii",
    		leet: "61AD11"
    	},
    	{
    		word: "glagah",
    		leet: "61A6A4"
    	},
    	{
    		word: "glagol",
    		leet: "61A601"
    	},
    	{
    		word: "glazed",
    		leet: "61A2ED"
    	},
    	{
    		word: "glazes",
    		leet: "61A2E5"
    	},
    	{
    		word: "glebae",
    		leet: "61EBAE"
    	},
    	{
    		word: "glebal",
    		leet: "61EBA1"
    	},
    	{
    		word: "glebes",
    		leet: "61EBE5"
    	},
    	{
    		word: "gledes",
    		leet: "61EDE5"
    	},
    	{
    		word: "gledge",
    		leet: "61ED6E"
    	},
    	{
    		word: "gleeds",
    		leet: "61EED5"
    	},
    	{
    		word: "gleets",
    		leet: "61EE75"
    	},
    	{
    		word: "glided",
    		leet: "611DED"
    	},
    	{
    		word: "glides",
    		leet: "611DE5"
    	},
    	{
    		word: "gliffs",
    		leet: "611FF5"
    	},
    	{
    		word: "gliosa",
    		leet: "61105A"
    	},
    	{
    		word: "glitch",
    		leet: "6117C4"
    	},
    	{
    		word: "gloats",
    		leet: "610A75"
    	},
    	{
    		word: "global",
    		leet: "610BA1"
    	},
    	{
    		word: "globed",
    		leet: "610BED"
    	},
    	{
    		word: "globes",
    		leet: "610BE5"
    	},
    	{
    		word: "gloeal",
    		leet: "610EA1"
    	},
    	{
    		word: "gloggs",
    		leet: "610665"
    	},
    	{
    		word: "glossa",
    		leet: "61055A"
    	},
    	{
    		word: "glosts",
    		leet: "610575"
    	},
    	{
    		word: "glozed",
    		leet: "6102ED"
    	},
    	{
    		word: "glozes",
    		leet: "6102E5"
    	},
    	{
    		word: "goaded",
    		leet: "60ADED"
    	},
    	{
    		word: "goaled",
    		leet: "60A1ED"
    	},
    	{
    		word: "goalee",
    		leet: "60A1EE"
    	},
    	{
    		word: "goalie",
    		leet: "60A11E"
    	},
    	{
    		word: "goatee",
    		leet: "60A7EE"
    	},
    	{
    		word: "gobbed",
    		leet: "60BBED"
    	},
    	{
    		word: "gobbet",
    		leet: "60BBE7"
    	},
    	{
    		word: "gobble",
    		leet: "60BB1E"
    	},
    	{
    		word: "gobies",
    		leet: "60B1E5"
    	},
    	{
    		word: "gobiid",
    		leet: "60B11D"
    	},
    	{
    		word: "goblet",
    		leet: "60B1E7"
    	},
    	{
    		word: "goboes",
    		leet: "60B0E5"
    	},
    	{
    		word: "godded",
    		leet: "60DDED"
    	},
    	{
    		word: "godlet",
    		leet: "60D1E7"
    	},
    	{
    		word: "godsib",
    		leet: "60D51B"
    	},
    	{
    		word: "goetae",
    		leet: "60E7AE"
    	},
    	{
    		word: "goethe",
    		leet: "60E74E"
    	},
    	{
    		word: "goetia",
    		leet: "60E71A"
    	},
    	{
    		word: "goetic",
    		leet: "60E71C"
    	},
    	{
    		word: "goffle",
    		leet: "60FF1E"
    	},
    	{
    		word: "goggle",
    		leet: "60661E"
    	},
    	{
    		word: "goglet",
    		leet: "6061E7"
    	},
    	{
    		word: "gohila",
    		leet: "60411A"
    	},
    	{
    		word: "goidel",
    		leet: "601DE1"
    	},
    	{
    		word: "golach",
    		leet: "601AC4"
    	},
    	{
    		word: "goldic",
    		leet: "601D1C"
    	},
    	{
    		word: "goldie",
    		leet: "601D1E"
    	},
    	{
    		word: "golfed",
    		leet: "601FED"
    	},
    	{
    		word: "goliad",
    		leet: "6011AD"
    	},
    	{
    		word: "goloch",
    		leet: "6010C4"
    	},
    	{
    		word: "golosh",
    		leet: "601054"
    	},
    	{
    		word: "goodie",
    		leet: "600D1E"
    	},
    	{
    		word: "goofah",
    		leet: "600FA4"
    	},
    	{
    		word: "goofed",
    		leet: "600FED"
    	},
    	{
    		word: "googol",
    		leet: "600601"
    	},
    	{
    		word: "goolah",
    		leet: "6001A4"
    	},
    	{
    		word: "goolde",
    		leet: "6001DE"
    	},
    	{
    		word: "goosed",
    		leet: "6005ED"
    	},
    	{
    		word: "gooses",
    		leet: "6005E5"
    	},
    	{
    		word: "gootee",
    		leet: "6007EE"
    	},
    	{
    		word: "goozle",
    		leet: "60021E"
    	},
    	{
    		word: "goslet",
    		leet: "6051E7"
    	},
    	{
    		word: "gothic",
    		leet: "60741C"
    	},
    	{
    		word: "gozell",
    		leet: "602E11"
    	},
    	{
    		word: "gozill",
    		leet: "602111"
    	},
    	{
    		word: "gthite",
    		leet: "67417E"
    	},
    	{
    		word: "habble",
    		leet: "4ABB1E"
    	},
    	{
    		word: "habeas",
    		leet: "4ABEA5"
    	},
    	{
    		word: "habile",
    		leet: "4AB11E"
    	},
    	{
    		word: "habits",
    		leet: "4AB175"
    	},
    	{
    		word: "haboob",
    		leet: "4AB00B"
    	},
    	{
    		word: "hachis",
    		leet: "4AC415"
    	},
    	{
    		word: "hadada",
    		leet: "4ADADA"
    	},
    	{
    		word: "hadbot",
    		leet: "4ADB07"
    	},
    	{
    		word: "haddie",
    		leet: "4ADD1E"
    	},
    	{
    		word: "hadith",
    		leet: "4AD174"
    	},
    	{
    		word: "hadjee",
    		leet: "4AD9EE"
    	},
    	{
    		word: "hadjes",
    		leet: "4AD9E5"
    	},
    	{
    		word: "hadjis",
    		leet: "4AD915"
    	},
    	{
    		word: "haffat",
    		leet: "4AFFA7"
    	},
    	{
    		word: "haffet",
    		leet: "4AFFE7"
    	},
    	{
    		word: "haffit",
    		leet: "4AFF17"
    	},
    	{
    		word: "haffle",
    		leet: "4AFF1E"
    	},
    	{
    		word: "hafted",
    		leet: "4AF7ED"
    	},
    	{
    		word: "hagada",
    		leet: "4A6ADA"
    	},
    	{
    		word: "haggai",
    		leet: "4A66A1"
    	},
    	{
    		word: "hagged",
    		leet: "4A66ED"
    	},
    	{
    		word: "haggis",
    		leet: "4A6615"
    	},
    	{
    		word: "haggle",
    		leet: "4A661E"
    	},
    	{
    		word: "haglet",
    		leet: "4A61E7"
    	},
    	{
    		word: "haidee",
    		leet: "4A1DEE"
    	},
    	{
    		word: "hailed",
    		leet: "4A11ED"
    	},
    	{
    		word: "hailes",
    		leet: "4A11E5"
    	},
    	{
    		word: "hailse",
    		leet: "4A115E"
    	},
    	{
    		word: "haisla",
    		leet: "4A151A"
    	},
    	{
    		word: "hajjes",
    		leet: "4A99E5"
    	},
    	{
    		word: "hajjis",
    		leet: "4A9915"
    	},
    	{
    		word: "halala",
    		leet: "4A1A1A"
    	},
    	{
    		word: "halebi",
    		leet: "4A1EB1"
    	},
    	{
    		word: "halest",
    		leet: "4A1E57"
    	},
    	{
    		word: "halide",
    		leet: "4A11DE"
    	},
    	{
    		word: "halids",
    		leet: "4A11D5"
    	},
    	{
    		word: "halite",
    		leet: "4A117E"
    	},
    	{
    		word: "hallah",
    		leet: "4A11A4"
    	},
    	{
    		word: "hallel",
    		leet: "4A11E1"
    	},
    	{
    		word: "halloa",
    		leet: "4A110A"
    	},
    	{
    		word: "halloo",
    		leet: "4A1100"
    	},
    	{
    		word: "hallos",
    		leet: "4A1105"
    	},
    	{
    		word: "hallot",
    		leet: "4A1107"
    	},
    	{
    		word: "haloed",
    		leet: "4A10ED"
    	},
    	{
    		word: "haloes",
    		leet: "4A10E5"
    	},
    	{
    		word: "haloid",
    		leet: "4A101D"
    	},
    	{
    		word: "halted",
    		leet: "4A17ED"
    	},
    	{
    		word: "haoles",
    		leet: "4A01E5"
    	},
    	{
    		word: "hashab",
    		leet: "4A54AB"
    	},
    	{
    		word: "hashed",
    		leet: "4A54ED"
    	},
    	{
    		word: "hashes",
    		leet: "4A54E5"
    	},
    	{
    		word: "haslet",
    		leet: "4A51E7"
    	},
    	{
    		word: "hassel",
    		leet: "4A55E1"
    	},
    	{
    		word: "hassle",
    		leet: "4A551E"
    	},
    	{
    		word: "hasted",
    		leet: "4A57ED"
    	},
    	{
    		word: "hastes",
    		leet: "4A57E5"
    	},
    	{
    		word: "hastif",
    		leet: "4A571F"
    	},
    	{
    		word: "hatted",
    		leet: "4A77ED"
    	},
    	{
    		word: "hattic",
    		leet: "4A771C"
    	},
    	{
    		word: "hattie",
    		leet: "4A771E"
    	},
    	{
    		word: "hazels",
    		leet: "4A2E15"
    	},
    	{
    		word: "headed",
    		leet: "4EADED"
    	},
    	{
    		word: "headle",
    		leet: "4EAD1E"
    	},
    	{
    		word: "healed",
    		leet: "4EA1ED"
    	},
    	{
    		word: "health",
    		leet: "4EA174"
    	},
    	{
    		word: "heated",
    		leet: "4EA7ED"
    	},
    	{
    		word: "heaths",
    		leet: "4EA745"
    	},
    	{
    		word: "hebete",
    		leet: "4EBE7E"
    	},
    	{
    		word: "hecate",
    		leet: "4ECA7E"
    	},
    	{
    		word: "hectic",
    		leet: "4EC71C"
    	},
    	{
    		word: "heddle",
    		leet: "4EDD1E"
    	},
    	{
    		word: "hedebo",
    		leet: "4EDEB0"
    	},
    	{
    		word: "hedged",
    		leet: "4ED6ED"
    	},
    	{
    		word: "hedges",
    		leet: "4ED6E5"
    	},
    	{
    		word: "heeded",
    		leet: "4EEDED"
    	},
    	{
    		word: "heeled",
    		leet: "4EE1ED"
    	},
    	{
    		word: "heezed",
    		leet: "4EE2ED"
    	},
    	{
    		word: "heezes",
    		leet: "4EE2E5"
    	},
    	{
    		word: "heezie",
    		leet: "4EE21E"
    	},
    	{
    		word: "hefted",
    		leet: "4EF7ED"
    	},
    	{
    		word: "height",
    		leet: "4E1647"
    	},
    	{
    		word: "heiled",
    		leet: "4E11ED"
    	},
    	{
    		word: "heists",
    		leet: "4E1575"
    	},
    	{
    		word: "heized",
    		leet: "4E12ED"
    	},
    	{
    		word: "hejazi",
    		leet: "4E9A21"
    	},
    	{
    		word: "helbeh",
    		leet: "4E1BE4"
    	},
    	{
    		word: "heliac",
    		leet: "4E11AC"
    	},
    	{
    		word: "helide",
    		leet: "4E11DE"
    	},
    	{
    		word: "helios",
    		leet: "4E1105"
    	},
    	{
    		word: "helled",
    		leet: "4E11ED"
    	},
    	{
    		word: "hellos",
    		leet: "4E1105"
    	},
    	{
    		word: "helots",
    		leet: "4E1075"
    	},
    	{
    		word: "helzel",
    		leet: "4E12E1"
    	},
    	{
    		word: "hestia",
    		leet: "4E571A"
    	},
    	{
    		word: "hettie",
    		leet: "4E771E"
    	},
    	{
    		word: "hiatal",
    		leet: "41A7A1"
    	},
    	{
    		word: "hibito",
    		leet: "41B170"
    	},
    	{
    		word: "hicaco",
    		leet: "41CAC0"
    	},
    	{
    		word: "hidage",
    		leet: "41DA6E"
    	},
    	{
    		word: "higgle",
    		leet: "41661E"
    	},
    	{
    		word: "highth",
    		leet: "416474"
    	},
    	{
    		word: "hights",
    		leet: "416475"
    	},
    	{
    		word: "hilled",
    		leet: "4111ED"
    	},
    	{
    		word: "hillel",
    		leet: "4111E1"
    	},
    	{
    		word: "hillet",
    		leet: "4111E7"
    	},
    	{
    		word: "hilloa",
    		leet: "41110A"
    	},
    	{
    		word: "hillos",
    		leet: "411105"
    	},
    	{
    		word: "hilsah",
    		leet: "4115A4"
    	},
    	{
    		word: "hilted",
    		leet: "4117ED"
    	},
    	{
    		word: "hissed",
    		leet: "4155ED"
    	},
    	{
    		word: "hissel",
    		leet: "4155E1"
    	},
    	{
    		word: "hisses",
    		leet: "4155E5"
    	},
    	{
    		word: "histed",
    		leet: "4157ED"
    	},
    	{
    		word: "histie",
    		leet: "41571E"
    	},
    	{
    		word: "hizzie",
    		leet: "41221E"
    	},
    	{
    		word: "hoagie",
    		leet: "40A61E"
    	},
    	{
    		word: "hobbed",
    		leet: "40BBED"
    	},
    	{
    		word: "hobbet",
    		leet: "40BBE7"
    	},
    	{
    		word: "hobbil",
    		leet: "40BB11"
    	},
    	{
    		word: "hobbit",
    		leet: "40BB17"
    	},
    	{
    		word: "hobble",
    		leet: "40BB1E"
    	},
    	{
    		word: "hobits",
    		leet: "40B175"
    	},
    	{
    		word: "hoblob",
    		leet: "40B10B"
    	},
    	{
    		word: "hoboed",
    		leet: "40B0ED"
    	},
    	{
    		word: "hoboes",
    		leet: "40B0E5"
    	},
    	{
    		word: "hodads",
    		leet: "40DAD5"
    	},
    	{
    		word: "hoddle",
    		leet: "40DD1E"
    	},
    	{
    		word: "hogged",
    		leet: "4066ED"
    	},
    	{
    		word: "hoggee",
    		leet: "4066EE"
    	},
    	{
    		word: "hogget",
    		leet: "4066E7"
    	},
    	{
    		word: "hoggie",
    		leet: "40661E"
    	},
    	{
    		word: "hogtie",
    		leet: "40671E"
    	},
    	{
    		word: "hoised",
    		leet: "4015ED"
    	},
    	{
    		word: "hoises",
    		leet: "4015E5"
    	},
    	{
    		word: "hoists",
    		leet: "401575"
    	},
    	{
    		word: "holcad",
    		leet: "401CAD"
    	},
    	{
    		word: "holies",
    		leet: "4011E5"
    	},
    	{
    		word: "holist",
    		leet: "401157"
    	},
    	{
    		word: "hollas",
    		leet: "4011A5"
    	},
    	{
    		word: "holloa",
    		leet: "40110A"
    	},
    	{
    		word: "holloo",
    		leet: "401100"
    	},
    	{
    		word: "hollos",
    		leet: "401105"
    	},
    	{
    		word: "hooded",
    		leet: "400DED"
    	},
    	{
    		word: "hoodie",
    		leet: "400D1E"
    	},
    	{
    		word: "hoodle",
    		leet: "400D1E"
    	},
    	{
    		word: "hoodoo",
    		leet: "400D00"
    	},
    	{
    		word: "hoofed",
    		leet: "400FED"
    	},
    	{
    		word: "hoolee",
    		leet: "4001EE"
    	},
    	{
    		word: "hoolie",
    		leet: "40011E"
    	},
    	{
    		word: "hootch",
    		leet: "4007C4"
    	},
    	{
    		word: "hooted",
    		leet: "4007ED"
    	},
    	{
    		word: "hosels",
    		leet: "405E15"
    	},
    	{
    		word: "hostal",
    		leet: "4057A1"
    	},
    	{
    		word: "hosted",
    		leet: "4057ED"
    	},
    	{
    		word: "hostel",
    		leet: "4057E1"
    	},
    	{
    		word: "hostie",
    		leet: "40571E"
    	},
    	{
    		word: "hostle",
    		leet: "40571E"
    	},
    	{
    		word: "hotbed",
    		leet: "407BED"
    	},
    	{
    		word: "hotcha",
    		leet: "407C4A"
    	},
    	{
    		word: "hotdog",
    		leet: "407D06"
    	},
    	{
    		word: "hotels",
    		leet: "407E15"
    	},
    	{
    		word: "hotted",
    		leet: "4077ED"
    	},
    	{
    		word: "hottie",
    		leet: "40771E"
    	},
    	{
    		word: "hottle",
    		leet: "40771E"
    	},
    	{
    		word: "ibices",
    		leet: "1B1CE5"
    	},
    	{
    		word: "ibilao",
    		leet: "1B11A0"
    	},
    	{
    		word: "ibises",
    		leet: "1B15E5"
    	},
    	{
    		word: "icicle",
    		leet: "1C1C1E"
    	},
    	{
    		word: "iciest",
    		leet: "1C1E57"
    	},
    	{
    		word: "idalia",
    		leet: "1DA11A"
    	},
    	{
    		word: "ideaed",
    		leet: "1DEAED"
    	},
    	{
    		word: "ideals",
    		leet: "1DEA15"
    	},
    	{
    		word: "ideata",
    		leet: "1DEA7A"
    	},
    	{
    		word: "ideate",
    		leet: "1DEA7E"
    	},
    	{
    		word: "ideist",
    		leet: "1DE157"
    	},
    	{
    		word: "idesia",
    		leet: "1DE51A"
    	},
    	{
    		word: "idigbo",
    		leet: "1D16B0"
    	},
    	{
    		word: "idiots",
    		leet: "1D1075"
    	},
    	{
    		word: "iditol",
    		leet: "1D1701"
    	},
    	{
    		word: "idlest",
    		leet: "1D1E57"
    	},
    	{
    		word: "idlish",
    		leet: "1D1154"
    	},
    	{
    		word: "idoist",
    		leet: "1D0157"
    	},
    	{
    		word: "idolet",
    		leet: "1D01E7"
    	},
    	{
    		word: "idotea",
    		leet: "1D07EA"
    	},
    	{
    		word: "igloos",
    		leet: "161005"
    	},
    	{
    		word: "iliads",
    		leet: "111AD5"
    	},
    	{
    		word: "iliahi",
    		leet: "111A41"
    	},
    	{
    		word: "ilicic",
    		leet: "111C1C"
    	},
    	{
    		word: "illect",
    		leet: "111EC7"
    	},
    	{
    		word: "illess",
    		leet: "111E55"
    	},
    	{
    		word: "illest",
    		leet: "111E57"
    	},
    	{
    		word: "illish",
    		leet: "111154"
    	},
    	{
    		word: "illite",
    		leet: "11117E"
    	},
    	{
    		word: "iodate",
    		leet: "10DA7E"
    	},
    	{
    		word: "iodide",
    		leet: "10D1DE"
    	},
    	{
    		word: "iodids",
    		leet: "10D1D5"
    	},
    	{
    		word: "iodite",
    		leet: "10D17E"
    	},
    	{
    		word: "iodize",
    		leet: "10D12E"
    	},
    	{
    		word: "iodols",
    		leet: "10D015"
    	},
    	{
    		word: "iodoso",
    		leet: "10D050"
    	},
    	{
    		word: "iolite",
    		leet: "10117E"
    	},
    	{
    		word: "iotize",
    		leet: "10712E"
    	},
    	{
    		word: "isabel",
    		leet: "15ABE1"
    	},
    	{
    		word: "isaiah",
    		leet: "15A1A4"
    	},
    	{
    		word: "isatic",
    		leet: "15A71C"
    	},
    	{
    		word: "isatid",
    		leet: "15A71D"
    	},
    	{
    		word: "isatis",
    		leet: "15A715"
    	},
    	{
    		word: "ischia",
    		leet: "15C41A"
    	},
    	{
    		word: "iscose",
    		leet: "15C05E"
    	},
    	{
    		word: "isicle",
    		leet: "151C1E"
    	},
    	{
    		word: "isidae",
    		leet: "151DAE"
    	},
    	{
    		word: "isidia",
    		leet: "151D1A"
    	},
    	{
    		word: "isleta",
    		leet: "151E7A"
    	},
    	{
    		word: "islets",
    		leet: "151E75"
    	},
    	{
    		word: "isodef",
    		leet: "150DEF"
    	},
    	{
    		word: "isohel",
    		leet: "1504E1"
    	},
    	{
    		word: "isolde",
    		leet: "1501DE"
    	},
    	{
    		word: "isolog",
    		leet: "150106"
    	},
    	{
    		word: "isotac",
    		leet: "1507AC"
    	},
    	{
    		word: "isseis",
    		leet: "155E15"
    	},
    	{
    		word: "issite",
    		leet: "15517E"
    	},
    	{
    		word: "istles",
    		leet: "1571E5"
    	},
    	{
    		word: "italic",
    		leet: "17A11C"
    	},
    	{
    		word: "itched",
    		leet: "17C4ED"
    	},
    	{
    		word: "itches",
    		leet: "17C4E5"
    	},
    	{
    		word: "ithaca",
    		leet: "174ACA"
    	},
    	{
    		word: "ithiel",
    		leet: "1741E1"
    	},
    	{
    		word: "itoist",
    		leet: "170157"
    	},
    	{
    		word: "itself",
    		leet: "175E1F"
    	},
    	{
    		word: "izafat",
    		leet: "12AFA7"
    	},
    	{
    		word: "jabbed",
    		leet: "9ABBED"
    	},
    	{
    		word: "jabble",
    		leet: "9ABB1E"
    	},
    	{
    		word: "jabots",
    		leet: "9AB075"
    	},
    	{
    		word: "jacals",
    		leet: "9ACA15"
    	},
    	{
    		word: "jacate",
    		leet: "9ACA7E"
    	},
    	{
    		word: "jadded",
    		leet: "9ADDED"
    	},
    	{
    		word: "jadish",
    		leet: "9AD154"
    	},
    	{
    		word: "jagath",
    		leet: "9A6A74"
    	},
    	{
    		word: "jagged",
    		leet: "9A66ED"
    	},
    	{
    		word: "jailed",
    		leet: "9A11ED"
    	},
    	{
    		word: "jasies",
    		leet: "9A51E5"
    	},
    	{
    		word: "jassid",
    		leet: "9A551D"
    	},
    	{
    		word: "jataco",
    		leet: "9A7AC0"
    	},
    	{
    		word: "jatoba",
    		leet: "9A70BA"
    	},
    	{
    		word: "jazies",
    		leet: "9A21E5"
    	},
    	{
    		word: "jazzed",
    		leet: "9A22ED"
    	},
    	{
    		word: "jazzes",
    		leet: "9A22E5"
    	},
    	{
    		word: "jebels",
    		leet: "9EBE15"
    	},
    	{
    		word: "jeetee",
    		leet: "9EE7EE"
    	},
    	{
    		word: "jeffie",
    		leet: "9EFF1E"
    	},
    	{
    		word: "jehads",
    		leet: "9E4AD5"
    	},
    	{
    		word: "jellab",
    		leet: "9E11AB"
    	},
    	{
    		word: "jelled",
    		leet: "9E11ED"
    	},
    	{
    		word: "jellib",
    		leet: "9E111B"
    	},
    	{
    		word: "jessed",
    		leet: "9E55ED"
    	},
    	{
    		word: "jesses",
    		leet: "9E55E5"
    	},
    	{
    		word: "jessie",
    		leet: "9E551E"
    	},
    	{
    		word: "jested",
    		leet: "9E57ED"
    	},
    	{
    		word: "jestee",
    		leet: "9E57EE"
    	},
    	{
    		word: "jetted",
    		leet: "9E77ED"
    	},
    	{
    		word: "jezail",
    		leet: "9E2A11"
    	},
    	{
    		word: "jeziah",
    		leet: "9E21A4"
    	},
    	{
    		word: "jibbah",
    		leet: "91BBA4"
    	},
    	{
    		word: "jibbed",
    		leet: "91BBED"
    	},
    	{
    		word: "jibbeh",
    		leet: "91BBE4"
    	},
    	{
    		word: "jiffle",
    		leet: "91FF1E"
    	},
    	{
    		word: "jigged",
    		leet: "9166ED"
    	},
    	{
    		word: "jigget",
    		leet: "9166E7"
    	},
    	{
    		word: "jiggit",
    		leet: "916617"
    	},
    	{
    		word: "jiggle",
    		leet: "91661E"
    	},
    	{
    		word: "jigote",
    		leet: "91607E"
    	},
    	{
    		word: "jihads",
    		leet: "914AD5"
    	},
    	{
    		word: "jillet",
    		leet: "9111E7"
    	},
    	{
    		word: "jilted",
    		leet: "9117ED"
    	},
    	{
    		word: "jiltee",
    		leet: "9117EE"
    	},
    	{
    		word: "jobade",
    		leet: "90BADE"
    	},
    	{
    		word: "jobbed",
    		leet: "90BBED"
    	},
    	{
    		word: "jobbet",
    		leet: "90BBE7"
    	},
    	{
    		word: "jobble",
    		leet: "90BB1E"
    	},
    	{
    		word: "jocose",
    		leet: "90C05E"
    	},
    	{
    		word: "jocote",
    		leet: "90C07E"
    	},
    	{
    		word: "jogged",
    		leet: "9066ED"
    	},
    	{
    		word: "joggle",
    		leet: "90661E"
    	},
    	{
    		word: "joists",
    		leet: "901575"
    	},
    	{
    		word: "jojoba",
    		leet: "9090BA"
    	},
    	{
    		word: "jolted",
    		leet: "9017ED"
    	},
    	{
    		word: "joshed",
    		leet: "9054ED"
    	},
    	{
    		word: "joshes",
    		leet: "9054E5"
    	},
    	{
    		word: "josiah",
    		leet: "9051A4"
    	},
    	{
    		word: "josses",
    		leet: "9055E5"
    	},
    	{
    		word: "jostle",
    		leet: "90571E"
    	},
    	{
    		word: "jotisi",
    		leet: "907151"
    	},
    	{
    		word: "jotted",
    		leet: "9077ED"
    	},
    	{
    		word: "labels",
    		leet: "1ABE15"
    	},
    	{
    		word: "labial",
    		leet: "1AB1A1"
    	},
    	{
    		word: "labile",
    		leet: "1AB11E"
    	},
    	{
    		word: "labite",
    		leet: "1AB17E"
    	},
    	{
    		word: "lablab",
    		leet: "1AB1AB"
    	},
    	{
    		word: "laccic",
    		leet: "1ACC1C"
    	},
    	{
    		word: "laccol",
    		leet: "1ACC01"
    	},
    	{
    		word: "laches",
    		leet: "1AC4E5"
    	},
    	{
    		word: "lachsa",
    		leet: "1AC45A"
    	},
    	{
    		word: "lacoca",
    		leet: "1AC0CA"
    	},
    	{
    		word: "lactic",
    		leet: "1AC71C"
    	},
    	{
    		word: "lactid",
    		leet: "1AC71D"
    	},
    	{
    		word: "lactol",
    		leet: "1AC701"
    	},
    	{
    		word: "laddie",
    		leet: "1ADD1E"
    	},
    	{
    		word: "ladies",
    		leet: "1AD1E5"
    	},
    	{
    		word: "ladled",
    		leet: "1AD1ED"
    	},
    	{
    		word: "ladles",
    		leet: "1AD1E5"
    	},
    	{
    		word: "laelia",
    		leet: "1AE11A"
    	},
    	{
    		word: "laetic",
    		leet: "1AE71C"
    	},
    	{
    		word: "lafite",
    		leet: "1AF17E"
    	},
    	{
    		word: "lagged",
    		leet: "1A66ED"
    	},
    	{
    		word: "laical",
    		leet: "1A1CA1"
    	},
    	{
    		word: "laichs",
    		leet: "1A1C45"
    	},
    	{
    		word: "laighs",
    		leet: "1A1645"
    	},
    	{
    		word: "laiose",
    		leet: "1A105E"
    	},
    	{
    		word: "laisse",
    		leet: "1A155E"
    	},
    	{
    		word: "laithe",
    		leet: "1A174E"
    	},
    	{
    		word: "lalled",
    		leet: "1A11ED"
    	},
    	{
    		word: "laodah",
    		leet: "1A0DA4"
    	},
    	{
    		word: "lashed",
    		leet: "1A54ED"
    	},
    	{
    		word: "lashes",
    		leet: "1A54E5"
    	},
    	{
    		word: "lasses",
    		leet: "1A55E5"
    	},
    	{
    		word: "lasset",
    		leet: "1A55E7"
    	},
    	{
    		word: "lassie",
    		leet: "1A551E"
    	},
    	{
    		word: "lassos",
    		leet: "1A5505"
    	},
    	{
    		word: "lasted",
    		leet: "1A57ED"
    	},
    	{
    		word: "latest",
    		leet: "1A7E57"
    	},
    	{
    		word: "lathed",
    		leet: "1A74ED"
    	},
    	{
    		word: "lathee",
    		leet: "1A74EE"
    	},
    	{
    		word: "lathes",
    		leet: "1A74E5"
    	},
    	{
    		word: "lathie",
    		leet: "1A741E"
    	},
    	{
    		word: "latigo",
    		leet: "1A7160"
    	},
    	{
    		word: "latish",
    		leet: "1A7154"
    	},
    	{
    		word: "latite",
    		leet: "1A717E"
    	},
    	{
    		word: "lazied",
    		leet: "1A21ED"
    	},
    	{
    		word: "lazies",
    		leet: "1A21E5"
    	},
    	{
    		word: "leaded",
    		leet: "1EADED"
    	},
    	{
    		word: "leafed",
    		leet: "1EAFED"
    	},
    	{
    		word: "leafit",
    		leet: "1EAF17"
    	},
    	{
    		word: "leased",
    		leet: "1EA5ED"
    	},
    	{
    		word: "leases",
    		leet: "1EA5E5"
    	},
    	{
    		word: "leasts",
    		leet: "1EA575"
    	},
    	{
    		word: "lechea",
    		leet: "1EC4EA"
    	},
    	{
    		word: "leches",
    		leet: "1EC4E5"
    	},
    	{
    		word: "lecthi",
    		leet: "1EC741"
    	},
    	{
    		word: "ledged",
    		leet: "1ED6ED"
    	},
    	{
    		word: "ledges",
    		leet: "1ED6E5"
    	},
    	{
    		word: "ledget",
    		leet: "1ED6E7"
    	},
    	{
    		word: "leegte",
    		leet: "1EE67E"
    	},
    	{
    		word: "leetle",
    		leet: "1EE71E"
    	},
    	{
    		word: "lefsel",
    		leet: "1EF5E1"
    	},
    	{
    		word: "legals",
    		leet: "1E6A15"
    	},
    	{
    		word: "legate",
    		leet: "1E6A7E"
    	},
    	{
    		word: "legati",
    		leet: "1E6A71"
    	},
    	{
    		word: "legato",
    		leet: "1E6A70"
    	},
    	{
    		word: "legged",
    		leet: "1E66ED"
    	},
    	{
    		word: "legist",
    		leet: "1E6157"
    	},
    	{
    		word: "legits",
    		leet: "1E6175"
    	},
    	{
    		word: "leglet",
    		leet: "1E61E7"
    	},
    	{
    		word: "lesath",
    		leet: "1E5A74"
    	},
    	{
    		word: "lesbia",
    		leet: "1E5B1A"
    	},
    	{
    		word: "lesche",
    		leet: "1E5C4E"
    	},
    	{
    		word: "leslie",
    		leet: "1E511E"
    	},
    	{
    		word: "lessee",
    		leet: "1E55EE"
    	},
    	{
    		word: "lesses",
    		leet: "1E55E5"
    	},
    	{
    		word: "lethal",
    		leet: "1E74A1"
    	},
    	{
    		word: "lethes",
    		leet: "1E74E5"
    	},
    	{
    		word: "letoff",
    		leet: "1E70FF"
    	},
    	{
    		word: "letted",
    		leet: "1E77ED"
    	},
    	{
    		word: "lettic",
    		leet: "1E771C"
    	},
    	{
    		word: "liable",
    		leet: "11AB1E"
    	},
    	{
    		word: "liaise",
    		leet: "11A15E"
    	},
    	{
    		word: "libate",
    		leet: "11BA7E"
    	},
    	{
    		word: "libbed",
    		leet: "11BBED"
    	},
    	{
    		word: "libbet",
    		leet: "11BBE7"
    	},
    	{
    		word: "libels",
    		leet: "11BE15"
    	},
    	{
    		word: "libget",
    		leet: "11B6E7"
    	},
    	{
    		word: "libido",
    		leet: "11B1D0"
    	},
    	{
    		word: "lichee",
    		leet: "11C4EE"
    	},
    	{
    		word: "lichis",
    		leet: "11C415"
    	},
    	{
    		word: "lichts",
    		leet: "11C475"
    	},
    	{
    		word: "lidded",
    		leet: "11DDED"
    	},
    	{
    		word: "lidias",
    		leet: "11D1A5"
    	},
    	{
    		word: "liebig",
    		leet: "11EB16"
    	},
    	{
    		word: "lieges",
    		leet: "11E6E5"
    	},
    	{
    		word: "liflod",
    		leet: "11F10D"
    	},
    	{
    		word: "lifted",
    		leet: "11F7ED"
    	},
    	{
    		word: "ligase",
    		leet: "116A5E"
    	},
    	{
    		word: "ligate",
    		leet: "116A7E"
    	},
    	{
    		word: "liggat",
    		leet: "1166A7"
    	},
    	{
    		word: "lights",
    		leet: "116475"
    	},
    	{
    		word: "lilacs",
    		leet: "111AC5"
    	},
    	{
    		word: "lilial",
    		leet: "1111A1"
    	},
    	{
    		word: "lilied",
    		leet: "1111ED"
    	},
    	{
    		word: "lilies",
    		leet: "1111E5"
    	},
    	{
    		word: "lilith",
    		leet: "111174"
    	},
    	{
    		word: "lilted",
    		leet: "1117ED"
    	},
    	{
    		word: "lisles",
    		leet: "1151E5"
    	},
    	{
    		word: "lisses",
    		leet: "1155E5"
    	},
    	{
    		word: "listed",
    		leet: "1157ED"
    	},
    	{
    		word: "listel",
    		leet: "1157E1"
    	},
    	{
    		word: "litchi",
    		leet: "117C41"
    	},
    	{
    		word: "lithia",
    		leet: "11741A"
    	},
    	{
    		word: "lithic",
    		leet: "11741C"
    	},
    	{
    		word: "lithog",
    		leet: "117406"
    	},
    	{
    		word: "lithol",
    		leet: "117401"
    	},
    	{
    		word: "lithos",
    		leet: "117405"
    	},
    	{
    		word: "litsea",
    		leet: "1175EA"
    	},
    	{
    		word: "little",
    		leet: "11771E"
    	},
    	{
    		word: "lizzie",
    		leet: "11221E"
    	},
    	{
    		word: "loaded",
    		leet: "10ADED"
    	},
    	{
    		word: "loafed",
    		leet: "10AFED"
    	},
    	{
    		word: "loathe",
    		leet: "10A74E"
    	},
    	{
    		word: "lobale",
    		leet: "10BA1E"
    	},
    	{
    		word: "lobata",
    		leet: "10BA7A"
    	},
    	{
    		word: "lobate",
    		leet: "10BA7E"
    	},
    	{
    		word: "lobbed",
    		leet: "10BBED"
    	},
    	{
    		word: "lobfig",
    		leet: "10BF16"
    	},
    	{
    		word: "lobola",
    		leet: "10B01A"
    	},
    	{
    		word: "lobolo",
    		leet: "10B010"
    	},
    	{
    		word: "lobosa",
    		leet: "10B05A"
    	},
    	{
    		word: "lobose",
    		leet: "10B05E"
    	},
    	{
    		word: "locale",
    		leet: "10CA1E"
    	},
    	{
    		word: "locals",
    		leet: "10CA15"
    	},
    	{
    		word: "locate",
    		leet: "10CA7E"
    	},
    	{
    		word: "lochia",
    		leet: "10C41A"
    	},
    	{
    		word: "locoed",
    		leet: "10C0ED"
    	},
    	{
    		word: "locoes",
    		leet: "10C0E5"
    	},
    	{
    		word: "lodged",
    		leet: "10D6ED"
    	},
    	{
    		word: "lodges",
    		leet: "10D6E5"
    	},
    	{
    		word: "lofted",
    		leet: "10F7ED"
    	},
    	{
    		word: "logeia",
    		leet: "106E1A"
    	},
    	{
    		word: "loggat",
    		leet: "1066A7"
    	},
    	{
    		word: "logged",
    		leet: "1066ED"
    	},
    	{
    		word: "logget",
    		leet: "1066E7"
    	},
    	{
    		word: "loggia",
    		leet: "10661A"
    	},
    	{
    		word: "loggie",
    		leet: "10661E"
    	},
    	{
    		word: "logics",
    		leet: "1061C5"
    	},
    	{
    		word: "loglet",
    		leet: "1061E7"
    	},
    	{
    		word: "loglog",
    		leet: "106106"
    	},
    	{
    		word: "logoes",
    		leet: "1060E5"
    	},
    	{
    		word: "logoff",
    		leet: "1060FF"
    	},
    	{
    		word: "lohoch",
    		leet: "1040C4"
    	},
    	{
    		word: "loligo",
    		leet: "101160"
    	},
    	{
    		word: "lolled",
    		leet: "1011ED"
    	},
    	{
    		word: "loofah",
    		leet: "100FA4"
    	},
    	{
    		word: "loofas",
    		leet: "100FA5"
    	},
    	{
    		word: "loofie",
    		leet: "100F1E"
    	},
    	{
    		word: "looies",
    		leet: "1001E5"
    	},
    	{
    		word: "loosed",
    		leet: "1005ED"
    	},
    	{
    		word: "looses",
    		leet: "1005E5"
    	},
    	{
    		word: "looted",
    		leet: "1007ED"
    	},
    	{
    		word: "lootie",
    		leet: "10071E"
    	},
    	{
    		word: "losels",
    		leet: "105E15"
    	},
    	{
    		word: "losses",
    		leet: "1055E5"
    	},
    	{
    		word: "lotahs",
    		leet: "107A45"
    	},
    	{
    		word: "lotase",
    		leet: "107A5E"
    	},
    	{
    		word: "lotted",
    		leet: "1077ED"
    	},
    	{
    		word: "lottie",
    		leet: "10771E"
    	},
    	{
    		word: "lottos",
    		leet: "107705"
    	},
    	{
    		word: "oafish",
    		leet: "0AF154"
    	},
    	{
    		word: "oathed",
    		leet: "0A74ED"
    	},
    	{
    		word: "obeahs",
    		leet: "0BEA45"
    	},
    	{
    		word: "obeche",
    		leet: "0BEC4E"
    	},
    	{
    		word: "obeish",
    		leet: "0BE154"
    	},
    	{
    		word: "obelia",
    		leet: "0BE11A"
    	},
    	{
    		word: "obital",
    		leet: "0B17A1"
    	},
    	{
    		word: "object",
    		leet: "0B9EC7"
    	},
    	{
    		word: "oblast",
    		leet: "0B1A57"
    	},
    	{
    		word: "oblata",
    		leet: "0B1A7A"
    	},
    	{
    		word: "oblate",
    		leet: "0B1A7E"
    	},
    	{
    		word: "oblige",
    		leet: "0B116E"
    	},
    	{
    		word: "oboist",
    		leet: "0B0157"
    	},
    	{
    		word: "oboles",
    		leet: "0B01E5"
    	},
    	{
    		word: "obolet",
    		leet: "0B01E7"
    	},
    	{
    		word: "obolos",
    		leet: "0B0105"
    	},
    	{
    		word: "obsede",
    		leet: "0B5EDE"
    	},
    	{
    		word: "obsess",
    		leet: "0B5E55"
    	},
    	{
    		word: "obside",
    		leet: "0B51DE"
    	},
    	{
    		word: "obstet",
    		leet: "0B57E7"
    	},
    	{
    		word: "obtect",
    		leet: "0B7EC7"
    	},
    	{
    		word: "obtest",
    		leet: "0B7E57"
    	},
    	{
    		word: "ocelli",
    		leet: "0CE111"
    	},
    	{
    		word: "ocelot",
    		leet: "0CE107"
    	},
    	{
    		word: "ocotea",
    		leet: "0C07EA"
    	},
    	{
    		word: "octads",
    		leet: "0C7AD5"
    	},
    	{
    		word: "octect",
    		leet: "0C7EC7"
    	},
    	{
    		word: "octets",
    		leet: "0C7E75"
    	},
    	{
    		word: "octile",
    		leet: "0C711E"
    	},
    	{
    		word: "octoad",
    		leet: "0C70AD"
    	},
    	{
    		word: "octode",
    		leet: "0C70DE"
    	},
    	{
    		word: "octoic",
    		leet: "0C701C"
    	},
    	{
    		word: "octoid",
    		leet: "0C701D"
    	},
    	{
    		word: "octose",
    		leet: "0C705E"
    	},
    	{
    		word: "oddest",
    		leet: "0DDE57"
    	},
    	{
    		word: "oddish",
    		leet: "0DD154"
    	},
    	{
    		word: "odelet",
    		leet: "0DE1E7"
    	},
    	{
    		word: "odessa",
    		leet: "0DE55A"
    	},
    	{
    		word: "odible",
    		leet: "0D1B1E"
    	},
    	{
    		word: "oecist",
    		leet: "0EC157"
    	},
    	{
    		word: "oecoid",
    		leet: "0EC01D"
    	},
    	{
    		word: "oesogi",
    		leet: "0E5061"
    	},
    	{
    		word: "offals",
    		leet: "0FFA15"
    	},
    	{
    		word: "office",
    		leet: "0FF1CE"
    	},
    	{
    		word: "offish",
    		leet: "0FF154"
    	},
    	{
    		word: "offlet",
    		leet: "0FF1E7"
    	},
    	{
    		word: "offset",
    		leet: "0FF5E7"
    	},
    	{
    		word: "oflete",
    		leet: "0F1E7E"
    	},
    	{
    		word: "oftest",
    		leet: "0F7E57"
    	},
    	{
    		word: "ogdoad",
    		leet: "06D0AD"
    	},
    	{
    		word: "ogdoas",
    		leet: "06D0A5"
    	},
    	{
    		word: "oglala",
    		leet: "061A1A"
    	},
    	{
    		word: "oilish",
    		leet: "011154"
    	},
    	{
    		word: "oillet",
    		leet: "0111E7"
    	},
    	{
    		word: "olacad",
    		leet: "01ACAD"
    	},
    	{
    		word: "oldest",
    		leet: "01DE57"
    	},
    	{
    		word: "oldies",
    		leet: "01D1E5"
    	},
    	{
    		word: "oldish",
    		leet: "01D154"
    	},
    	{
    		word: "olease",
    		leet: "01EA5E"
    	},
    	{
    		word: "oleate",
    		leet: "01EA7E"
    	},
    	{
    		word: "oleose",
    		leet: "01E05E"
    	},
    	{
    		word: "olfact",
    		leet: "01FAC7"
    	},
    	{
    		word: "oodles",
    		leet: "00D1E5"
    	},
    	{
    		word: "ooecia",
    		leet: "00EC1A"
    	},
    	{
    		word: "ooglea",
    		leet: "0061EA"
    	},
    	{
    		word: "ooidal",
    		leet: "001DA1"
    	},
    	{
    		word: "oolite",
    		leet: "00117E"
    	},
    	{
    		word: "oolith",
    		leet: "001174"
    	},
    	{
    		word: "ootids",
    		leet: "0071D5"
    	},
    	{
    		word: "oozoid",
    		leet: "00201D"
    	},
    	{
    		word: "osages",
    		leet: "05A6E5"
    	},
    	{
    		word: "osella",
    		leet: "05E11A"
    	},
    	{
    		word: "oselle",
    		leet: "05E11E"
    	},
    	{
    		word: "osteal",
    		leet: "057EA1"
    	},
    	{
    		word: "ostial",
    		leet: "0571A1"
    	},
    	{
    		word: "ostsis",
    		leet: "057515"
    	},
    	{
    		word: "otello",
    		leet: "07E110"
    	},
    	{
    		word: "otidae",
    		leet: "071DAE"
    	},
    	{
    		word: "otides",
    		leet: "071DE5"
    	},
    	{
    		word: "otidia",
    		leet: "071D1A"
    	},
    	{
    		word: "otiose",
    		leet: "07105E"
    	},
    	{
    		word: "otitic",
    		leet: "07171C"
    	},
    	{
    		word: "otitis",
    		leet: "071715"
    	},
    	{
    		word: "otosis",
    		leet: "070515"
    	},
    	{
    		word: "ototoi",
    		leet: "070701"
    	},
    	{
    		word: "sabalo",
    		leet: "5ABA10"
    	},
    	{
    		word: "sabbat",
    		leet: "5ABBA7"
    	},
    	{
    		word: "sabbed",
    		leet: "5ABBED"
    	},
    	{
    		word: "sabeca",
    		leet: "5ABECA"
    	},
    	{
    		word: "sables",
    		leet: "5AB1E5"
    	},
    	{
    		word: "sabots",
    		leet: "5AB075"
    	},
    	{
    		word: "sacate",
    		leet: "5ACA7E"
    	},
    	{
    		word: "saccha",
    		leet: "5ACC4A"
    	},
    	{
    		word: "saccli",
    		leet: "5ACC11"
    	},
    	{
    		word: "saccos",
    		leet: "5ACC05"
    	},
    	{
    		word: "sacela",
    		leet: "5ACE1A"
    	},
    	{
    		word: "sachet",
    		leet: "5AC4E7"
    	},
    	{
    		word: "saddle",
    		leet: "5ADD1E"
    	},
    	{
    		word: "sadhes",
    		leet: "5AD4E5"
    	},
    	{
    		word: "sadist",
    		leet: "5AD157"
    	},
    	{
    		word: "sadite",
    		leet: "5AD17E"
    	},
    	{
    		word: "safest",
    		leet: "5AFE57"
    	},
    	{
    		word: "sagaie",
    		leet: "5A6A1E"
    	},
    	{
    		word: "sagest",
    		leet: "5A6E57"
    	},
    	{
    		word: "sagged",
    		leet: "5A66ED"
    	},
    	{
    		word: "sahibs",
    		leet: "5A41B5"
    	},
    	{
    		word: "saices",
    		leet: "5A1CE5"
    	},
    	{
    		word: "saigas",
    		leet: "5A16A5"
    	},
    	{
    		word: "sailed",
    		leet: "5A11ED"
    	},
    	{
    		word: "saithe",
    		leet: "5A174E"
    	},
    	{
    		word: "saitic",
    		leet: "5A171C"
    	},
    	{
    		word: "salada",
    		leet: "5A1ADA"
    	},
    	{
    		word: "salade",
    		leet: "5A1ADE"
    	},
    	{
    		word: "salads",
    		leet: "5A1AD5"
    	},
    	{
    		word: "salago",
    		leet: "5A1A60"
    	},
    	{
    		word: "saldid",
    		leet: "5A1D1D"
    	},
    	{
    		word: "salele",
    		leet: "5A1E1E"
    	},
    	{
    		word: "salish",
    		leet: "5A1154"
    	},
    	{
    		word: "salite",
    		leet: "5A117E"
    	},
    	{
    		word: "sallee",
    		leet: "5A11EE"
    	},
    	{
    		word: "sallet",
    		leet: "5A11E7"
    	},
    	{
    		word: "salloo",
    		leet: "5A1100"
    	},
    	{
    		word: "salols",
    		leet: "5A1015"
    	},
    	{
    		word: "salted",
    		leet: "5A17ED"
    	},
    	{
    		word: "saltee",
    		leet: "5A17EE"
    	},
    	{
    		word: "saltie",
    		leet: "5A171E"
    	},
    	{
    		word: "sashed",
    		leet: "5A54ED"
    	},
    	{
    		word: "sashes",
    		leet: "5A54E5"
    	},
    	{
    		word: "sassed",
    		leet: "5A55ED"
    	},
    	{
    		word: "sasses",
    		leet: "5A55E5"
    	},
    	{
    		word: "sattie",
    		leet: "5A771E"
    	},
    	{
    		word: "sattle",
    		leet: "5A771E"
    	},
    	{
    		word: "sblood",
    		leet: "5B100D"
    	},
    	{
    		word: "scabia",
    		leet: "5CAB1A"
    	},
    	{
    		word: "scabid",
    		leet: "5CAB1D"
    	},
    	{
    		word: "scaife",
    		leet: "5CA1FE"
    	},
    	{
    		word: "scalae",
    		leet: "5CA1AE"
    	},
    	{
    		word: "scalds",
    		leet: "5CA1D5"
    	},
    	{
    		word: "scaled",
    		leet: "5CA1ED"
    	},
    	{
    		word: "scales",
    		leet: "5CA1E5"
    	},
    	{
    		word: "scalet",
    		leet: "5CA1E7"
    	},
    	{
    		word: "scalfe",
    		leet: "5CA1FE"
    	},
    	{
    		word: "scalls",
    		leet: "5CA115"
    	},
    	{
    		word: "scatch",
    		leet: "5CA7C4"
    	},
    	{
    		word: "scathe",
    		leet: "5CA74E"
    	},
    	{
    		word: "scatts",
    		leet: "5CA775"
    	},
    	{
    		word: "scheat",
    		leet: "5C4EA7"
    	},
    	{
    		word: "schist",
    		leet: "5C4157"
    	},
    	{
    		word: "schizo",
    		leet: "5C4120"
    	},
    	{
    		word: "schola",
    		leet: "5C401A"
    	},
    	{
    		word: "school",
    		leet: "5C4001"
    	},
    	{
    		word: "sciage",
    		leet: "5C1A6E"
    	},
    	{
    		word: "sciath",
    		leet: "5C1A74"
    	},
    	{
    		word: "scilla",
    		leet: "5C111A"
    	},
    	{
    		word: "sclaff",
    		leet: "5C1AFF"
    	},
    	{
    		word: "sclate",
    		leet: "5C1A7E"
    	},
    	{
    		word: "scliff",
    		leet: "5C11FF"
    	},
    	{
    		word: "scoffs",
    		leet: "5C0FF5"
    	},
    	{
    		word: "scogie",
    		leet: "5C061E"
    	},
    	{
    		word: "scolds",
    		leet: "5C01D5"
    	},
    	{
    		word: "scolia",
    		leet: "5C011A"
    	},
    	{
    		word: "scoloc",
    		leet: "5C010C"
    	},
    	{
    		word: "scolog",
    		leet: "5C0106"
    	},
    	{
    		word: "scooch",
    		leet: "5C00C4"
    	},
    	{
    		word: "scoots",
    		leet: "5C0075"
    	},
    	{
    		word: "scotal",
    		leet: "5C07A1"
    	},
    	{
    		word: "scotch",
    		leet: "5C07C4"
    	},
    	{
    		word: "scotia",
    		leet: "5C071A"
    	},
    	{
    		word: "scotic",
    		leet: "5C071C"
    	},
    	{
    		word: "sdeath",
    		leet: "5DEA74"
    	},
    	{
    		word: "seabag",
    		leet: "5EABA6"
    	},
    	{
    		word: "seabed",
    		leet: "5EABED"
    	},
    	{
    		word: "seabee",
    		leet: "5EABEE"
    	},
    	{
    		word: "seadog",
    		leet: "5EAD06"
    	},
    	{
    		word: "sealch",
    		leet: "5EA1C4"
    	},
    	{
    		word: "sealed",
    		leet: "5EA1ED"
    	},
    	{
    		word: "sealet",
    		leet: "5EA1E7"
    	},
    	{
    		word: "seated",
    		leet: "5EA7ED"
    	},
    	{
    		word: "seathe",
    		leet: "5EA74E"
    	},
    	{
    		word: "sebago",
    		leet: "5EBA60"
    	},
    	{
    		word: "sebait",
    		leet: "5EBA17"
    	},
    	{
    		word: "sebate",
    		leet: "5EBA7E"
    	},
    	{
    		word: "secale",
    		leet: "5ECA1E"
    	},
    	{
    		word: "seccos",
    		leet: "5ECC05"
    	},
    	{
    		word: "secede",
    		leet: "5ECEDE"
    	},
    	{
    		word: "secesh",
    		leet: "5ECE54"
    	},
    	{
    		word: "secess",
    		leet: "5ECE55"
    	},
    	{
    		word: "sedate",
    		leet: "5EDA7E"
    	},
    	{
    		word: "sedged",
    		leet: "5ED6ED"
    	},
    	{
    		word: "sedges",
    		leet: "5ED6E5"
    	},
    	{
    		word: "sedile",
    		leet: "5ED11E"
    	},
    	{
    		word: "seeded",
    		leet: "5EEDED"
    	},
    	{
    		word: "seeled",
    		leet: "5EE1ED"
    	},
    	{
    		word: "seesee",
    		leet: "5EE5EE"
    	},
    	{
    		word: "seethe",
    		leet: "5EE74E"
    	},
    	{
    		word: "segged",
    		leet: "5E66ED"
    	},
    	{
    		word: "seggio",
    		leet: "5E6610"
    	},
    	{
    		word: "seghol",
    		leet: "5E6401"
    	},
    	{
    		word: "seiche",
    		leet: "5E1C4E"
    	},
    	{
    		word: "seidel",
    		leet: "5E1DE1"
    	},
    	{
    		word: "seised",
    		leet: "5E15ED"
    	},
    	{
    		word: "seises",
    		leet: "5E15E5"
    	},
    	{
    		word: "seized",
    		leet: "5E12ED"
    	},
    	{
    		word: "seizes",
    		leet: "5E12E5"
    	},
    	{
    		word: "selago",
    		leet: "5E1A60"
    	},
    	{
    		word: "selahs",
    		leet: "5E1A45"
    	},
    	{
    		word: "select",
    		leet: "5E1EC7"
    	},
    	{
    		word: "selfed",
    		leet: "5E1FED"
    	},
    	{
    		word: "selles",
    		leet: "5E11E5"
    	},
    	{
    		word: "sellie",
    		leet: "5E111E"
    	},
    	{
    		word: "seseli",
    		leet: "5E5E11"
    	},
    	{
    		word: "seshat",
    		leet: "5E54A7"
    	},
    	{
    		word: "sessed",
    		leet: "5E55ED"
    	},
    	{
    		word: "sestet",
    		leet: "5E57E7"
    	},
    	{
    		word: "sestia",
    		leet: "5E571A"
    	},
    	{
    		word: "sethic",
    		leet: "5E741C"
    	},
    	{
    		word: "setibo",
    		leet: "5E71B0"
    	},
    	{
    		word: "setoff",
    		leet: "5E70FF"
    	},
    	{
    		word: "setose",
    		leet: "5E705E"
    	},
    	{
    		word: "settee",
    		leet: "5E77EE"
    	},
    	{
    		word: "settle",
    		leet: "5E771E"
    	},
    	{
    		word: "settos",
    		leet: "5E7705"
    	},
    	{
    		word: "shaded",
    		leet: "54ADED"
    	},
    	{
    		word: "shades",
    		leet: "54ADE5"
    	},
    	{
    		word: "shafii",
    		leet: "54AF11"
    	},
    	{
    		word: "shafts",
    		leet: "54AF75"
    	},
    	{
    		word: "shagia",
    		leet: "54A61A"
    	},
    	{
    		word: "shahee",
    		leet: "54A4EE"
    	},
    	{
    		word: "shahid",
    		leet: "54A41D"
    	},
    	{
    		word: "shaled",
    		leet: "54A1ED"
    	},
    	{
    		word: "shalee",
    		leet: "54A1EE"
    	},
    	{
    		word: "shales",
    		leet: "54A1E5"
    	},
    	{
    		word: "shasta",
    		leet: "54A57A"
    	},
    	{
    		word: "sheafs",
    		leet: "54EAF5"
    	},
    	{
    		word: "sheals",
    		leet: "54EA15"
    	},
    	{
    		word: "sheath",
    		leet: "54EA74"
    	},
    	{
    		word: "shebat",
    		leet: "54EBA7"
    	},
    	{
    		word: "sheets",
    		leet: "54EE75"
    	},
    	{
    		word: "sheila",
    		leet: "54E11A"
    	},
    	{
    		word: "shelah",
    		leet: "54E1A4"
    	},
    	{
    		word: "shells",
    		leet: "54E115"
    	},
    	{
    		word: "shelta",
    		leet: "54E17A"
    	},
    	{
    		word: "sheols",
    		leet: "54E015"
    	},
    	{
    		word: "shesha",
    		leet: "54E54A"
    	},
    	{
    		word: "shibah",
    		leet: "541BA4"
    	},
    	{
    		word: "shield",
    		leet: "541E1D"
    	},
    	{
    		word: "shiels",
    		leet: "541E15"
    	},
    	{
    		word: "shiest",
    		leet: "541E57"
    	},
    	{
    		word: "shifts",
    		leet: "541F75"
    	},
    	{
    		word: "shiite",
    		leet: "54117E"
    	},
    	{
    		word: "shilfa",
    		leet: "5411FA"
    	},
    	{
    		word: "shilha",
    		leet: "54114A"
    	},
    	{
    		word: "shilla",
    		leet: "54111A"
    	},
    	{
    		word: "shills",
    		leet: "541115"
    	},
    	{
    		word: "shiloh",
    		leet: "541104"
    	},
    	{
    		word: "shists",
    		leet: "541575"
    	},
    	{
    		word: "shoals",
    		leet: "540A15"
    	},
    	{
    		word: "shoats",
    		leet: "540A75"
    	},
    	{
    		word: "shohet",
    		leet: "5404E7"
    	},
    	{
    		word: "shohji",
    		leet: "540491"
    	},
    	{
    		word: "shojis",
    		leet: "540915"
    	},
    	{
    		word: "shooed",
    		leet: "5400ED"
    	},
    	{
    		word: "shoofa",
    		leet: "5400FA"
    	},
    	{
    		word: "shools",
    		leet: "540015"
    	},
    	{
    		word: "shoots",
    		leet: "540075"
    	},
    	{
    		word: "shotes",
    		leet: "5407E5"
    	},
    	{
    		word: "shotts",
    		leet: "540775"
    	},
    	{
    		word: "shtetl",
    		leet: "547E71"
    	},
    	{
    		word: "sialia",
    		leet: "51A11A"
    	},
    	{
    		word: "sialic",
    		leet: "51A11C"
    	},
    	{
    		word: "sialid",
    		leet: "51A11D"
    	},
    	{
    		word: "sialis",
    		leet: "51A115"
    	},
    	{
    		word: "sibbed",
    		leet: "51BBED"
    	},
    	{
    		word: "sicced",
    		leet: "51CCED"
    	},
    	{
    		word: "sicsac",
    		leet: "51C5AC"
    	},
    	{
    		word: "siddha",
    		leet: "51DD4A"
    	},
    	{
    		word: "siddhi",
    		leet: "51DD41"
    	},
    	{
    		word: "sidest",
    		leet: "51DE57"
    	},
    	{
    		word: "sidled",
    		leet: "51D1ED"
    	},
    	{
    		word: "sidles",
    		leet: "51D1E5"
    	},
    	{
    		word: "siecle",
    		leet: "51EC1E"
    	},
    	{
    		word: "sieged",
    		leet: "51E6ED"
    	},
    	{
    		word: "sieges",
    		leet: "51E6E5"
    	},
    	{
    		word: "siesta",
    		leet: "51E57A"
    	},
    	{
    		word: "siffle",
    		leet: "51FF1E"
    	},
    	{
    		word: "sifted",
    		leet: "51F7ED"
    	},
    	{
    		word: "sighed",
    		leet: "5164ED"
    	},
    	{
    		word: "sights",
    		leet: "516475"
    	},
    	{
    		word: "sigill",
    		leet: "516111"
    	},
    	{
    		word: "sigils",
    		leet: "516115"
    	},
    	{
    		word: "sigloi",
    		leet: "516101"
    	},
    	{
    		word: "siglos",
    		leet: "516105"
    	},
    	{
    		word: "sijill",
    		leet: "519111"
    	},
    	{
    		word: "silage",
    		leet: "511A6E"
    	},
    	{
    		word: "siletz",
    		leet: "511E72"
    	},
    	{
    		word: "silica",
    		leet: "5111CA"
    	},
    	{
    		word: "silico",
    		leet: "5111C0"
    	},
    	{
    		word: "siloed",
    		leet: "5110ED"
    	},
    	{
    		word: "silted",
    		leet: "5117ED"
    	},
    	{
    		word: "sisals",
    		leet: "515A15"
    	},
    	{
    		word: "sisith",
    		leet: "515174"
    	},
    	{
    		word: "sissoo",
    		leet: "515500"
    	},
    	{
    		word: "sistle",
    		leet: "51571E"
    	},
    	{
    		word: "sithes",
    		leet: "5174E5"
    	},
    	{
    		word: "sittee",
    		leet: "5177EE"
    	},
    	{
    		word: "sizzle",
    		leet: "51221E"
    	},
    	{
    		word: "slatch",
    		leet: "51A7C4"
    	},
    	{
    		word: "slated",
    		leet: "51A7ED"
    	},
    	{
    		word: "slates",
    		leet: "51A7E5"
    	},
    	{
    		word: "sledge",
    		leet: "51ED6E"
    	},
    	{
    		word: "sleech",
    		leet: "51EEC4"
    	},
    	{
    		word: "sleets",
    		leet: "51EE75"
    	},
    	{
    		word: "sleigh",
    		leet: "51E164"
    	},
    	{
    		word: "sliced",
    		leet: "511CED"
    	},
    	{
    		word: "slices",
    		leet: "511CE5"
    	},
    	{
    		word: "slicht",
    		leet: "511C47"
    	},
    	{
    		word: "slided",
    		leet: "511DED"
    	},
    	{
    		word: "slides",
    		leet: "511DE5"
    	},
    	{
    		word: "sliest",
    		leet: "511E57"
    	},
    	{
    		word: "slight",
    		leet: "511647"
    	},
    	{
    		word: "slitch",
    		leet: "5117C4"
    	},
    	{
    		word: "slodge",
    		leet: "510D6E"
    	},
    	{
    		word: "sloids",
    		leet: "5101D5"
    	},
    	{
    		word: "slojds",
    		leet: "5109D5"
    	},
    	{
    		word: "sloosh",
    		leet: "510054"
    	},
    	{
    		word: "sloted",
    		leet: "5107ED"
    	},
    	{
    		word: "sloths",
    		leet: "510745"
    	},
    	{
    		word: "sobbed",
    		leet: "50BBED"
    	},
    	{
    		word: "sobeit",
    		leet: "50BE17"
    	},
    	{
    		word: "sobole",
    		leet: "50B01E"
    	},
    	{
    		word: "socage",
    		leet: "50CA6E"
    	},
    	{
    		word: "social",
    		leet: "50C1A1"
    	},
    	{
    		word: "socies",
    		leet: "50C1E5"
    	},
    	{
    		word: "sociol",
    		leet: "50C101"
    	},
    	{
    		word: "socles",
    		leet: "50C1E5"
    	},
    	{
    		word: "sodaic",
    		leet: "50DA1C"
    	},
    	{
    		word: "sodded",
    		leet: "50DDED"
    	},
    	{
    		word: "soffit",
    		leet: "50FF17"
    	},
    	{
    		word: "softas",
    		leet: "50F7A5"
    	},
    	{
    		word: "softie",
    		leet: "50F71E"
    	},
    	{
    		word: "sogged",
    		leet: "5066ED"
    	},
    	{
    		word: "soiled",
    		leet: "5011ED"
    	},
    	{
    		word: "solace",
    		leet: "501ACE"
    	},
    	{
    		word: "solach",
    		leet: "501AC4"
    	},
    	{
    		word: "solate",
    		leet: "501A7E"
    	},
    	{
    		word: "soldat",
    		leet: "501DA7"
    	},
    	{
    		word: "soleas",
    		leet: "501EA5"
    	},
    	{
    		word: "soleil",
    		leet: "501E11"
    	},
    	{
    		word: "solfge",
    		leet: "501F6E"
    	},
    	{
    		word: "solgel",
    		leet: "5016E1"
    	},
    	{
    		word: "solidi",
    		leet: "5011D1"
    	},
    	{
    		word: "solido",
    		leet: "5011D0"
    	},
    	{
    		word: "solids",
    		leet: "5011D5"
    	},
    	{
    		word: "solist",
    		leet: "501157"
    	},
    	{
    		word: "solodi",
    		leet: "5010D1"
    	},
    	{
    		word: "soloed",
    		leet: "5010ED"
    	},
    	{
    		word: "soloth",
    		leet: "501074"
    	},
    	{
    		word: "soodle",
    		leet: "500D1E"
    	},
    	{
    		word: "soogee",
    		leet: "5006EE"
    	},
    	{
    		word: "soojee",
    		leet: "5009EE"
    	},
    	{
    		word: "soosoo",
    		leet: "500500"
    	},
    	{
    		word: "sooted",
    		leet: "5007ED"
    	},
    	{
    		word: "soothe",
    		leet: "50074E"
    	},
    	{
    		word: "sooths",
    		leet: "500745"
    	},
    	{
    		word: "soshed",
    		leet: "5054ED"
    	},
    	{
    		word: "sossle",
    		leet: "50551E"
    	},
    	{
    		word: "sothic",
    		leet: "50741C"
    	},
    	{
    		word: "sothis",
    		leet: "507415"
    	},
    	{
    		word: "sotols",
    		leet: "507015"
    	},
    	{
    		word: "sotted",
    		leet: "5077ED"
    	},
    	{
    		word: "sottie",
    		leet: "50771E"
    	},
    	{
    		word: "sozzle",
    		leet: "50221E"
    	},
    	{
    		word: "stable",
    		leet: "57AB1E"
    	},
    	{
    		word: "stacte",
    		leet: "57AC7E"
    	},
    	{
    		word: "stadda",
    		leet: "57ADDA"
    	},
    	{
    		word: "stades",
    		leet: "57ADE5"
    	},
    	{
    		word: "stadia",
    		leet: "57AD1A"
    	},
    	{
    		word: "stadic",
    		leet: "57AD1C"
    	},
    	{
    		word: "stadie",
    		leet: "57AD1E"
    	},
    	{
    		word: "stadle",
    		leet: "57AD1E"
    	},
    	{
    		word: "staffs",
    		leet: "57AFF5"
    	},
    	{
    		word: "staged",
    		leet: "57A6ED"
    	},
    	{
    		word: "stages",
    		leet: "57A6E5"
    	},
    	{
    		word: "staigs",
    		leet: "57A165"
    	},
    	{
    		word: "staith",
    		leet: "57A174"
    	},
    	{
    		word: "stalag",
    		leet: "57A1A6"
    	},
    	{
    		word: "staled",
    		leet: "57A1ED"
    	},
    	{
    		word: "stales",
    		leet: "57A1E5"
    	},
    	{
    		word: "stalls",
    		leet: "57A115"
    	},
    	{
    		word: "stases",
    		leet: "57A5E5"
    	},
    	{
    		word: "stasis",
    		leet: "57A515"
    	},
    	{
    		word: "statal",
    		leet: "57A7A1"
    	},
    	{
    		word: "stated",
    		leet: "57A7ED"
    	},
    	{
    		word: "states",
    		leet: "57A7E5"
    	},
    	{
    		word: "static",
    		leet: "57A71C"
    	},
    	{
    		word: "steads",
    		leet: "57EAD5"
    	},
    	{
    		word: "steals",
    		leet: "57EA15"
    	},
    	{
    		word: "steeds",
    		leet: "57EED5"
    	},
    	{
    		word: "steele",
    		leet: "57EE1E"
    	},
    	{
    		word: "steels",
    		leet: "57EE15"
    	},
    	{
    		word: "steigh",
    		leet: "57E164"
    	},
    	{
    		word: "stelae",
    		leet: "57E1AE"
    	},
    	{
    		word: "stelai",
    		leet: "57E1A1"
    	},
    	{
    		word: "steles",
    		leet: "57E1E5"
    	},
    	{
    		word: "stelic",
    		leet: "57E11C"
    	},
    	{
    		word: "stella",
    		leet: "57E11A"
    	},
    	{
    		word: "stetch",
    		leet: "57E7C4"
    	},
    	{
    		word: "stibic",
    		leet: "571B1C"
    	},
    	{
    		word: "stichs",
    		leet: "571C45"
    	},
    	{
    		word: "sticta",
    		leet: "571C7A"
    	},
    	{
    		word: "stiffs",
    		leet: "571FF5"
    	},
    	{
    		word: "stifle",
    		leet: "571F1E"
    	},
    	{
    		word: "stiles",
    		leet: "5711E5"
    	},
    	{
    		word: "stilet",
    		leet: "5711E7"
    	},
    	{
    		word: "stills",
    		leet: "571115"
    	},
    	{
    		word: "stilts",
    		leet: "571175"
    	},
    	{
    		word: "stitch",
    		leet: "5717C4"
    	},
    	{
    		word: "stithe",
    		leet: "57174E"
    	},
    	{
    		word: "stoach",
    		leet: "570AC4"
    	},
    	{
    		word: "stoats",
    		leet: "570A75"
    	},
    	{
    		word: "stocah",
    		leet: "570CA4"
    	},
    	{
    		word: "stodge",
    		leet: "570D6E"
    	},
    	{
    		word: "stogie",
    		leet: "57061E"
    	},
    	{
    		word: "stoics",
    		leet: "5701C5"
    	},
    	{
    		word: "stolae",
    		leet: "5701AE"
    	},
    	{
    		word: "stolas",
    		leet: "5701A5"
    	},
    	{
    		word: "stoled",
    		leet: "5701ED"
    	},
    	{
    		word: "stoles",
    		leet: "5701E5"
    	},
    	{
    		word: "stolid",
    		leet: "57011D"
    	},
    	{
    		word: "stooge",
    		leet: "57006E"
    	},
    	{
    		word: "stools",
    		leet: "570015"
    	},
    	{
    		word: "stooth",
    		leet: "570074"
    	},
    	{
    		word: "tabbed",
    		leet: "7ABBED"
    	},
    	{
    		word: "tabbis",
    		leet: "7ABB15"
    	},
    	{
    		word: "tablas",
    		leet: "7AB1A5"
    	},
    	{
    		word: "tabled",
    		leet: "7AB1ED"
    	},
    	{
    		word: "tables",
    		leet: "7AB1E5"
    	},
    	{
    		word: "tablet",
    		leet: "7AB1E7"
    	},
    	{
    		word: "taboos",
    		leet: "7AB005"
    	},
    	{
    		word: "taboot",
    		leet: "7AB007"
    	},
    	{
    		word: "taches",
    		leet: "7AC4E5"
    	},
    	{
    		word: "tactic",
    		leet: "7AC71C"
    	},
    	{
    		word: "taffia",
    		leet: "7AFF1A"
    	},
    	{
    		word: "taffle",
    		leet: "7AFF1E"
    	},
    	{
    		word: "tafias",
    		leet: "7AF1A5"
    	},
    	{
    		word: "tagala",
    		leet: "7A6A1A"
    	},
    	{
    		word: "tagalo",
    		leet: "7A6A10"
    	},
    	{
    		word: "tagged",
    		leet: "7A66ED"
    	},
    	{
    		word: "taggle",
    		leet: "7A661E"
    	},
    	{
    		word: "tagish",
    		leet: "7A6154"
    	},
    	{
    		word: "taglet",
    		leet: "7A61E7"
    	},
    	{
    		word: "taglia",
    		leet: "7A611A"
    	},
    	{
    		word: "tahali",
    		leet: "7A4A11"
    	},
    	{
    		word: "tahiti",
    		leet: "7A4171"
    	},
    	{
    		word: "tahsil",
    		leet: "7A4511"
    	},
    	{
    		word: "taiaha",
    		leet: "7A1A4A"
    	},
    	{
    		word: "taigas",
    		leet: "7A16A5"
    	},
    	{
    		word: "taigle",
    		leet: "7A161E"
    	},
    	{
    		word: "taihoa",
    		leet: "7A140A"
    	},
    	{
    		word: "tailed",
    		leet: "7A11ED"
    	},
    	{
    		word: "tailet",
    		leet: "7A11E7"
    	},
    	{
    		word: "tailge",
    		leet: "7A116E"
    	},
    	{
    		word: "taille",
    		leet: "7A111E"
    	},
    	{
    		word: "tailte",
    		leet: "7A117E"
    	},
    	{
    		word: "taisch",
    		leet: "7A15C4"
    	},
    	{
    		word: "taisho",
    		leet: "7A1540"
    	},
    	{
    		word: "talaje",
    		leet: "7A1A9E"
    	},
    	{
    		word: "talbot",
    		leet: "7A1B07"
    	},
    	{
    		word: "talced",
    		leet: "7A1CED"
    	},
    	{
    		word: "talite",
    		leet: "7A117E"
    	},
    	{
    		word: "talles",
    		leet: "7A11E5"
    	},
    	{
    		word: "tallet",
    		leet: "7A11E7"
    	},
    	{
    		word: "tallis",
    		leet: "7A1115"
    	},
    	{
    		word: "tallit",
    		leet: "7A1117"
    	},
    	{
    		word: "tallol",
    		leet: "7A1101"
    	},
    	{
    		word: "talose",
    		leet: "7A105E"
    	},
    	{
    		word: "taoist",
    		leet: "7A0157"
    	},
    	{
    		word: "taotai",
    		leet: "7A07A1"
    	},
    	{
    		word: "tasajo",
    		leet: "7A5A90"
    	},
    	{
    		word: "tasbih",
    		leet: "7A5B14"
    	},
    	{
    		word: "tascal",
    		leet: "7A5CA1"
    	},
    	{
    		word: "tashie",
    		leet: "7A541E"
    	},
    	{
    		word: "taslet",
    		leet: "7A51E7"
    	},
    	{
    		word: "tassah",
    		leet: "7A55A4"
    	},
    	{
    		word: "tassal",
    		leet: "7A55A1"
    	},
    	{
    		word: "tassel",
    		leet: "7A55E1"
    	},
    	{
    		word: "tasses",
    		leet: "7A55E5"
    	},
    	{
    		word: "tasset",
    		leet: "7A55E7"
    	},
    	{
    		word: "tassie",
    		leet: "7A551E"
    	},
    	{
    		word: "tassoo",
    		leet: "7A5500"
    	},
    	{
    		word: "tasted",
    		leet: "7A57ED"
    	},
    	{
    		word: "tastes",
    		leet: "7A57E5"
    	},
    	{
    		word: "tatbeb",
    		leet: "7A7BEB"
    	},
    	{
    		word: "tatoos",
    		leet: "7A7005"
    	},
    	{
    		word: "tatted",
    		leet: "7A77ED"
    	},
    	{
    		word: "tattie",
    		leet: "7A771E"
    	},
    	{
    		word: "tattle",
    		leet: "7A771E"
    	},
    	{
    		word: "tattoo",
    		leet: "7A7700"
    	},
    	{
    		word: "tazeea",
    		leet: "7A2EEA"
    	},
    	{
    		word: "tazzas",
    		leet: "7A22A5"
    	},
    	{
    		word: "tchast",
    		leet: "7C4A57"
    	},
    	{
    		word: "teache",
    		leet: "7EAC4E"
    	},
    	{
    		word: "teagle",
    		leet: "7EA61E"
    	},
    	{
    		word: "teaish",
    		leet: "7EA154"
    	},
    	{
    		word: "teased",
    		leet: "7EA5ED"
    	},
    	{
    		word: "teasel",
    		leet: "7EA5E1"
    	},
    	{
    		word: "teases",
    		leet: "7EA5E5"
    	},
    	{
    		word: "teasle",
    		leet: "7EA51E"
    	},
    	{
    		word: "teated",
    		leet: "7EA7ED"
    	},
    	{
    		word: "teathe",
    		leet: "7EA74E"
    	},
    	{
    		word: "teazel",
    		leet: "7EA2E1"
    	},
    	{
    		word: "teazle",
    		leet: "7EA21E"
    	},
    	{
    		word: "tebbad",
    		leet: "7EBBAD"
    	},
    	{
    		word: "tebbet",
    		leet: "7EBBE7"
    	},
    	{
    		word: "tebeth",
    		leet: "7EBE74"
    	},
    	{
    		word: "tecali",
    		leet: "7ECA11"
    	},
    	{
    		word: "teched",
    		leet: "7EC4ED"
    	},
    	{
    		word: "techie",
    		leet: "7EC41E"
    	},
    	{
    		word: "tectal",
    		leet: "7EC7A1"
    	},
    	{
    		word: "tedded",
    		leet: "7EDDED"
    	},
    	{
    		word: "teedle",
    		leet: "7EED1E"
    	},
    	{
    		word: "teetee",
    		leet: "7EE7EE"
    	},
    	{
    		word: "teethe",
    		leet: "7EE74E"
    	},
    	{
    		word: "tehsil",
    		leet: "7E4511"
    	},
    	{
    		word: "teihte",
    		leet: "7E147E"
    	},
    	{
    		word: "teiids",
    		leet: "7E11D5"
    	},
    	{
    		word: "teioid",
    		leet: "7E101D"
    	},
    	{
    		word: "telega",
    		leet: "7E1E6A"
    	},
    	{
    		word: "teleia",
    		leet: "7E1E1A"
    	},
    	{
    		word: "telial",
    		leet: "7E11A1"
    	},
    	{
    		word: "tellee",
    		leet: "7E11EE"
    	},
    	{
    		word: "teslas",
    		leet: "7E51A5"
    	},
    	{
    		word: "tessel",
    		leet: "7E55E1"
    	},
    	{
    		word: "testae",
    		leet: "7E57AE"
    	},
    	{
    		word: "testao",
    		leet: "7E57A0"
    	},
    	{
    		word: "tested",
    		leet: "7E57ED"
    	},
    	{
    		word: "testee",
    		leet: "7E57EE"
    	},
    	{
    		word: "testes",
    		leet: "7E57E5"
    	},
    	{
    		word: "testis",
    		leet: "7E5715"
    	},
    	{
    		word: "thalia",
    		leet: "74A11A"
    	},
    	{
    		word: "thalli",
    		leet: "74A111"
    	},
    	{
    		word: "thatch",
    		leet: "74A7C4"
    	},
    	{
    		word: "thatll",
    		leet: "74A711"
    	},
    	{
    		word: "thecae",
    		leet: "74ECAE"
    	},
    	{
    		word: "thecal",
    		leet: "74ECA1"
    	},
    	{
    		word: "thecia",
    		leet: "74EC1A"
    	},
    	{
    		word: "thecla",
    		leet: "74EC1A"
    	},
    	{
    		word: "thefts",
    		leet: "74EF75"
    	},
    	{
    		word: "theist",
    		leet: "74E157"
    	},
    	{
    		word: "theses",
    		leet: "74E5E5"
    	},
    	{
    		word: "thesis",
    		leet: "74E515"
    	},
    	{
    		word: "thetas",
    		leet: "74E7A5"
    	},
    	{
    		word: "thetch",
    		leet: "74E7C4"
    	},
    	{
    		word: "thetic",
    		leet: "74E71C"
    	},
    	{
    		word: "thetis",
    		leet: "74E715"
    	},
    	{
    		word: "thiasi",
    		leet: "741A51"
    	},
    	{
    		word: "thibet",
    		leet: "741BE7"
    	},
    	{
    		word: "thible",
    		leet: "741B1E"
    	},
    	{
    		word: "thighs",
    		leet: "741645"
    	},
    	{
    		word: "thight",
    		leet: "741647"
    	},
    	{
    		word: "thills",
    		leet: "741115"
    	},
    	{
    		word: "thiols",
    		leet: "741015"
    	},
    	{
    		word: "thisbe",
    		leet: "7415BE"
    	},
    	{
    		word: "thisll",
    		leet: "741511"
    	},
    	{
    		word: "thitsi",
    		leet: "741751"
    	},
    	{
    		word: "thocht",
    		leet: "740C47"
    	},
    	{
    		word: "thoght",
    		leet: "740647"
    	},
    	{
    		word: "tholed",
    		leet: "7401ED"
    	},
    	{
    		word: "tholes",
    		leet: "7401E5"
    	},
    	{
    		word: "tholli",
    		leet: "740111"
    	},
    	{
    		word: "tholoi",
    		leet: "740101"
    	},
    	{
    		word: "tholos",
    		leet: "740105"
    	},
    	{
    		word: "thooid",
    		leet: "74001D"
    	},
    	{
    		word: "tibbie",
    		leet: "71BB1E"
    	},
    	{
    		word: "tibbit",
    		leet: "71BB17"
    	},
    	{
    		word: "tibiad",
    		leet: "71B1AD"
    	},
    	{
    		word: "tibiae",
    		leet: "71B1AE"
    	},
    	{
    		word: "tibial",
    		leet: "71B1A1"
    	},
    	{
    		word: "tibias",
    		leet: "71B1A5"
    	},
    	{
    		word: "ticals",
    		leet: "71CA15"
    	},
    	{
    		word: "tichel",
    		leet: "71C4E1"
    	},
    	{
    		word: "tictac",
    		leet: "71C7AC"
    	},
    	{
    		word: "tictic",
    		leet: "71C71C"
    	},
    	{
    		word: "tictoc",
    		leet: "71C70C"
    	},
    	{
    		word: "tidbit",
    		leet: "71DB17"
    	},
    	{
    		word: "tiddle",
    		leet: "71DD1E"
    	},
    	{
    		word: "tidied",
    		leet: "71D1ED"
    	},
    	{
    		word: "tidies",
    		leet: "71D1E5"
    	},
    	{
    		word: "tidife",
    		leet: "71D1FE"
    	},
    	{
    		word: "tiedog",
    		leet: "71ED06"
    	},
    	{
    		word: "tiffed",
    		leet: "71FFED"
    	},
    	{
    		word: "tiffie",
    		leet: "71FF1E"
    	},
    	{
    		word: "tiffle",
    		leet: "71FF1E"
    	},
    	{
    		word: "tights",
    		leet: "716475"
    	},
    	{
    		word: "tiglic",
    		leet: "71611C"
    	},
    	{
    		word: "tigtag",
    		leet: "7167A6"
    	},
    	{
    		word: "tildes",
    		leet: "711DE5"
    	},
    	{
    		word: "tilled",
    		leet: "7111ED"
    	},
    	{
    		word: "tillet",
    		leet: "7111E7"
    	},
    	{
    		word: "tillot",
    		leet: "711107"
    	},
    	{
    		word: "tilsit",
    		leet: "711517"
    	},
    	{
    		word: "tilted",
    		leet: "7117ED"
    	},
    	{
    		word: "tilths",
    		leet: "711745"
    	},
    	{
    		word: "titbit",
    		leet: "717B17"
    	},
    	{
    		word: "tithal",
    		leet: "7174A1"
    	},
    	{
    		word: "tithed",
    		leet: "7174ED"
    	},
    	{
    		word: "tithes",
    		leet: "7174E5"
    	},
    	{
    		word: "tities",
    		leet: "7171E5"
    	},
    	{
    		word: "titled",
    		leet: "7171ED"
    	},
    	{
    		word: "titles",
    		leet: "7171E5"
    	},
    	{
    		word: "tittie",
    		leet: "71771E"
    	},
    	{
    		word: "tittle",
    		leet: "71771E"
    	},
    	{
    		word: "tjaele",
    		leet: "79AE1E"
    	},
    	{
    		word: "toasts",
    		leet: "70A575"
    	},
    	{
    		word: "toatoa",
    		leet: "70A70A"
    	},
    	{
    		word: "tobiah",
    		leet: "70B1A4"
    	},
    	{
    		word: "tobias",
    		leet: "70B1A5"
    	},
    	{
    		word: "tobies",
    		leet: "70B1E5"
    	},
    	{
    		word: "toddle",
    		leet: "70DD1E"
    	},
    	{
    		word: "todies",
    		leet: "70D1E5"
    	},
    	{
    		word: "toetoe",
    		leet: "70E70E"
    	},
    	{
    		word: "toffee",
    		leet: "70FFEE"
    	},
    	{
    		word: "tofile",
    		leet: "70F11E"
    	},
    	{
    		word: "togaed",
    		leet: "706AED"
    	},
    	{
    		word: "togata",
    		leet: "706A7A"
    	},
    	{
    		word: "togate",
    		leet: "706A7E"
    	},
    	{
    		word: "togged",
    		leet: "7066ED"
    	},
    	{
    		word: "toggel",
    		leet: "7066E1"
    	},
    	{
    		word: "toggle",
    		leet: "70661E"
    	},
    	{
    		word: "toiled",
    		leet: "7011ED"
    	},
    	{
    		word: "toiles",
    		leet: "7011E5"
    	},
    	{
    		word: "toilet",
    		leet: "7011E7"
    	},
    	{
    		word: "toised",
    		leet: "7015ED"
    	},
    	{
    		word: "toited",
    		leet: "7017ED"
    	},
    	{
    		word: "toitoi",
    		leet: "701701"
    	},
    	{
    		word: "toledo",
    		leet: "701ED0"
    	},
    	{
    		word: "tolite",
    		leet: "70117E"
    	},
    	{
    		word: "tolled",
    		leet: "7011ED"
    	},
    	{
    		word: "tolsel",
    		leet: "7015E1"
    	},
    	{
    		word: "toltec",
    		leet: "7017EC"
    	},
    	{
    		word: "toodle",
    		leet: "700D1E"
    	},
    	{
    		word: "tooled",
    		leet: "7001ED"
    	},
    	{
    		word: "toolsi",
    		leet: "700151"
    	},
    	{
    		word: "toosie",
    		leet: "70051E"
    	},
    	{
    		word: "tooted",
    		leet: "7007ED"
    	},
    	{
    		word: "tooths",
    		leet: "700745"
    	},
    	{
    		word: "tootle",
    		leet: "70071E"
    	},
    	{
    		word: "toozle",
    		leet: "70021E"
    	},
    	{
    		word: "toozoo",
    		leet: "700200"
    	},
    	{
    		word: "toshes",
    		leet: "7054E5"
    	},
    	{
    		word: "tossed",
    		leet: "7055ED"
    	},
    	{
    		word: "tosses",
    		leet: "7055E5"
    	},
    	{
    		word: "tostao",
    		leet: "7057A0"
    	},
    	{
    		word: "totals",
    		leet: "707A15"
    	},
    	{
    		word: "totted",
    		leet: "7077ED"
    	},
    	{
    		word: "tottie",
    		leet: "70771E"
    	},
    	{
    		word: "tottle",
    		leet: "70771E"
    	},
    	{
    		word: "tsades",
    		leet: "75ADE5"
    	},
    	{
    		word: "tsadis",
    		leet: "75AD15"
    	},
    	{
    		word: "tsetse",
    		leet: "75E75E"
    	},
    	{
    		word: "tsotsi",
    		leet: "750751"
    	},
    	{
    		word: "tzetse",
    		leet: "72E75E"
    	},
    	{
    		word: "tzetze",
    		leet: "72E72E"
    	},
    	{
    		word: "zabeta",
    		leet: "2ABE7A"
    	},
    	{
    		word: "zabtie",
    		leet: "2AB71E"
    	},
    	{
    		word: "zacate",
    		leet: "2ACA7E"
    	},
    	{
    		word: "zaftig",
    		leet: "2AF716"
    	},
    	{
    		word: "zagaie",
    		leet: "2A6A1E"
    	},
    	{
    		word: "zagged",
    		leet: "2A66ED"
    	},
    	{
    		word: "zaitha",
    		leet: "2A174A"
    	},
    	{
    		word: "zealed",
    		leet: "2EA1ED"
    	},
    	{
    		word: "zealot",
    		leet: "2EA107"
    	},
    	{
    		word: "zebecs",
    		leet: "2EBEC5"
    	},
    	{
    		word: "zeidae",
    		leet: "2E1DAE"
    	},
    	{
    		word: "zested",
    		leet: "2E57ED"
    	},
    	{
    		word: "zibeth",
    		leet: "21BE74"
    	},
    	{
    		word: "zibets",
    		leet: "21BE75"
    	},
    	{
    		word: "ziczac",
    		leet: "21C2AC"
    	},
    	{
    		word: "zigged",
    		leet: "2166ED"
    	},
    	{
    		word: "zigzag",
    		leet: "2162A6"
    	},
    	{
    		word: "zillah",
    		leet: "2111A4"
    	},
    	{
    		word: "zitzit",
    		leet: "217217"
    	},
    	{
    		word: "zizith",
    		leet: "212174"
    	},
    	{
    		word: "zizzle",
    		leet: "21221E"
    	},
    	{
    		word: "zocalo",
    		leet: "20CA10"
    	},
    	{
    		word: "zodiac",
    		leet: "20D1AC"
    	},
    	{
    		word: "zoetic",
    		leet: "20E71C"
    	},
    	{
    		word: "zoftig",
    		leet: "20F716"
    	},
    	{
    		word: "zooids",
    		leet: "2001D5"
    	},
    	{
    		word: "zoosis",
    		leet: "200515"
    	},
    	{
    		word: "zootic",
    		leet: "20071C"
    	},
    	{
    		word: "zoozoo",
    		leet: "200200"
    	},
    	{
    		word: "aaa",
    		leet: "AAA"
    	},
    	{
    		word: "aah",
    		leet: "AA4"
    	},
    	{
    		word: "aal",
    		leet: "AA1"
    	},
    	{
    		word: "aas",
    		leet: "AA5"
    	},
    	{
    		word: "aba",
    		leet: "ABA"
    	},
    	{
    		word: "abb",
    		leet: "ABB"
    	},
    	{
    		word: "abc",
    		leet: "ABC"
    	},
    	{
    		word: "abd",
    		leet: "ABD"
    	},
    	{
    		word: "abe",
    		leet: "ABE"
    	},
    	{
    		word: "abl",
    		leet: "AB1"
    	},
    	{
    		word: "abo",
    		leet: "AB0"
    	},
    	{
    		word: "abs",
    		leet: "AB5"
    	},
    	{
    		word: "abt",
    		leet: "AB7"
    	},
    	{
    		word: "acc",
    		leet: "ACC"
    	},
    	{
    		word: "ace",
    		leet: "ACE"
    	},
    	{
    		word: "ach",
    		leet: "AC4"
    	},
    	{
    		word: "act",
    		leet: "AC7"
    	},
    	{
    		word: "ada",
    		leet: "ADA"
    	},
    	{
    		word: "adc",
    		leet: "ADC"
    	},
    	{
    		word: "add",
    		leet: "ADD"
    	},
    	{
    		word: "ade",
    		leet: "ADE"
    	},
    	{
    		word: "adj",
    		leet: "AD9"
    	},
    	{
    		word: "ado",
    		leet: "AD0"
    	},
    	{
    		word: "ads",
    		leet: "AD5"
    	},
    	{
    		word: "adz",
    		leet: "AD2"
    	},
    	{
    		word: "aes",
    		leet: "AE5"
    	},
    	{
    		word: "aet",
    		leet: "AE7"
    	},
    	{
    		word: "afb",
    		leet: "AFB"
    	},
    	{
    		word: "afd",
    		leet: "AFD"
    	},
    	{
    		word: "aff",
    		leet: "AFF"
    	},
    	{
    		word: "aft",
    		leet: "AF7"
    	},
    	{
    		word: "aga",
    		leet: "A6A"
    	},
    	{
    		word: "age",
    		leet: "A6E"
    	},
    	{
    		word: "ago",
    		leet: "A60"
    	},
    	{
    		word: "agt",
    		leet: "A67"
    	},
    	{
    		word: "aha",
    		leet: "A4A"
    	},
    	{
    		word: "ahi",
    		leet: "A41"
    	},
    	{
    		word: "aho",
    		leet: "A40"
    	},
    	{
    		word: "ahs",
    		leet: "A45"
    	},
    	{
    		word: "aht",
    		leet: "A47"
    	},
    	{
    		word: "aid",
    		leet: "A1D"
    	},
    	{
    		word: "ail",
    		leet: "A11"
    	},
    	{
    		word: "ais",
    		leet: "A15"
    	},
    	{
    		word: "ait",
    		leet: "A17"
    	},
    	{
    		word: "ala",
    		leet: "A1A"
    	},
    	{
    		word: "alb",
    		leet: "A1B"
    	},
    	{
    		word: "alc",
    		leet: "A1C"
    	},
    	{
    		word: "ald",
    		leet: "A1D"
    	},
    	{
    		word: "ale",
    		leet: "A1E"
    	},
    	{
    		word: "alf",
    		leet: "A1F"
    	},
    	{
    		word: "alg",
    		leet: "A16"
    	},
    	{
    		word: "all",
    		leet: "A11"
    	},
    	{
    		word: "alo",
    		leet: "A10"
    	},
    	{
    		word: "als",
    		leet: "A15"
    	},
    	{
    		word: "alt",
    		leet: "A17"
    	},
    	{
    		word: "aob",
    		leet: "A0B"
    	},
    	{
    		word: "asa",
    		leet: "A5A"
    	},
    	{
    		word: "asb",
    		leet: "A5B"
    	},
    	{
    		word: "ase",
    		leet: "A5E"
    	},
    	{
    		word: "asg",
    		leet: "A56"
    	},
    	{
    		word: "ash",
    		leet: "A54"
    	},
    	{
    		word: "ass",
    		leet: "A55"
    	},
    	{
    		word: "ast",
    		leet: "A57"
    	},
    	{
    		word: "ata",
    		leet: "A7A"
    	},
    	{
    		word: "ate",
    		leet: "A7E"
    	},
    	{
    		word: "ati",
    		leet: "A71"
    	},
    	{
    		word: "att",
    		leet: "A77"
    	},
    	{
    		word: "azo",
    		leet: "A20"
    	},
    	{
    		word: "baa",
    		leet: "BAA"
    	},
    	{
    		word: "bab",
    		leet: "BAB"
    	},
    	{
    		word: "bac",
    		leet: "BAC"
    	},
    	{
    		word: "bad",
    		leet: "BAD"
    	},
    	{
    		word: "bae",
    		leet: "BAE"
    	},
    	{
    		word: "bag",
    		leet: "BA6"
    	},
    	{
    		word: "bah",
    		leet: "BA4"
    	},
    	{
    		word: "bai",
    		leet: "BA1"
    	},
    	{
    		word: "bal",
    		leet: "BA1"
    	},
    	{
    		word: "bas",
    		leet: "BA5"
    	},
    	{
    		word: "bat",
    		leet: "BA7"
    	},
    	{
    		word: "bbl",
    		leet: "BB1"
    	},
    	{
    		word: "bbs",
    		leet: "BB5"
    	},
    	{
    		word: "bcd",
    		leet: "BCD"
    	},
    	{
    		word: "bcf",
    		leet: "BCF"
    	},
    	{
    		word: "bch",
    		leet: "BC4"
    	},
    	{
    		word: "bde",
    		leet: "BDE"
    	},
    	{
    		word: "bdl",
    		leet: "BD1"
    	},
    	{
    		word: "bds",
    		leet: "BD5"
    	},
    	{
    		word: "bea",
    		leet: "BEA"
    	},
    	{
    		word: "bec",
    		leet: "BEC"
    	},
    	{
    		word: "bed",
    		leet: "BED"
    	},
    	{
    		word: "bee",
    		leet: "BEE"
    	},
    	{
    		word: "bef",
    		leet: "BEF"
    	},
    	{
    		word: "beg",
    		leet: "BE6"
    	},
    	{
    		word: "bel",
    		leet: "BE1"
    	},
    	{
    		word: "bes",
    		leet: "BE5"
    	},
    	{
    		word: "bet",
    		leet: "BE7"
    	},
    	{
    		word: "bhd",
    		leet: "B4D"
    	},
    	{
    		word: "bib",
    		leet: "B1B"
    	},
    	{
    		word: "bid",
    		leet: "B1D"
    	},
    	{
    		word: "big",
    		leet: "B16"
    	},
    	{
    		word: "bio",
    		leet: "B10"
    	},
    	{
    		word: "bis",
    		leet: "B15"
    	},
    	{
    		word: "bit",
    		leet: "B17"
    	},
    	{
    		word: "biz",
    		leet: "B12"
    	},
    	{
    		word: "bld",
    		leet: "B1D"
    	},
    	{
    		word: "blo",
    		leet: "B10"
    	},
    	{
    		word: "bls",
    		leet: "B15"
    	},
    	{
    		word: "boa",
    		leet: "B0A"
    	},
    	{
    		word: "bob",
    		leet: "B0B"
    	},
    	{
    		word: "boc",
    		leet: "B0C"
    	},
    	{
    		word: "bod",
    		leet: "B0D"
    	},
    	{
    		word: "boe",
    		leet: "B0E"
    	},
    	{
    		word: "bog",
    		leet: "B06"
    	},
    	{
    		word: "boh",
    		leet: "B04"
    	},
    	{
    		word: "bol",
    		leet: "B01"
    	},
    	{
    		word: "boo",
    		leet: "B00"
    	},
    	{
    		word: "bos",
    		leet: "B05"
    	},
    	{
    		word: "bot",
    		leet: "B07"
    	},
    	{
    		word: "bsf",
    		leet: "B5F"
    	},
    	{
    		word: "bsh",
    		leet: "B54"
    	},
    	{
    		word: "btl",
    		leet: "B71"
    	},
    	{
    		word: "cab",
    		leet: "CAB"
    	},
    	{
    		word: "cad",
    		leet: "CAD"
    	},
    	{
    		word: "caf",
    		leet: "CAF"
    	},
    	{
    		word: "cag",
    		leet: "CA6"
    	},
    	{
    		word: "cai",
    		leet: "CA1"
    	},
    	{
    		word: "cal",
    		leet: "CA1"
    	},
    	{
    		word: "cat",
    		leet: "CA7"
    	},
    	{
    		word: "cdf",
    		leet: "CDF"
    	},
    	{
    		word: "cdg",
    		leet: "CD6"
    	},
    	{
    		word: "cee",
    		leet: "CEE"
    	},
    	{
    		word: "cfd",
    		leet: "CFD"
    	},
    	{
    		word: "cfh",
    		leet: "CF4"
    	},
    	{
    		word: "cfi",
    		leet: "CF1"
    	},
    	{
    		word: "cfs",
    		leet: "CF5"
    	},
    	{
    		word: "cgs",
    		leet: "C65"
    	},
    	{
    		word: "cha",
    		leet: "C4A"
    	},
    	{
    		word: "che",
    		leet: "C4E"
    	},
    	{
    		word: "chg",
    		leet: "C46"
    	},
    	{
    		word: "chi",
    		leet: "C41"
    	},
    	{
    		word: "cho",
    		leet: "C40"
    	},
    	{
    		word: "chs",
    		leet: "C45"
    	},
    	{
    		word: "cia",
    		leet: "C1A"
    	},
    	{
    		word: "cid",
    		leet: "C1D"
    	},
    	{
    		word: "cie",
    		leet: "C1E"
    	},
    	{
    		word: "cif",
    		leet: "C1F"
    	},
    	{
    		word: "cig",
    		leet: "C16"
    	},
    	{
    		word: "cis",
    		leet: "C15"
    	},
    	{
    		word: "cit",
    		leet: "C17"
    	},
    	{
    		word: "cli",
    		leet: "C11"
    	},
    	{
    		word: "clo",
    		leet: "C10"
    	},
    	{
    		word: "cob",
    		leet: "C0B"
    	},
    	{
    		word: "cod",
    		leet: "C0D"
    	},
    	{
    		word: "coe",
    		leet: "C0E"
    	},
    	{
    		word: "cog",
    		leet: "C06"
    	},
    	{
    		word: "col",
    		leet: "C01"
    	},
    	{
    		word: "coo",
    		leet: "C00"
    	},
    	{
    		word: "cos",
    		leet: "C05"
    	},
    	{
    		word: "cot",
    		leet: "C07"
    	},
    	{
    		word: "coz",
    		leet: "C02"
    	},
    	{
    		word: "csc",
    		leet: "C5C"
    	},
    	{
    		word: "csi",
    		leet: "C51"
    	},
    	{
    		word: "cst",
    		leet: "C57"
    	},
    	{
    		word: "cte",
    		leet: "C7E"
    	},
    	{
    		word: "ctf",
    		leet: "C7F"
    	},
    	{
    		word: "ctg",
    		leet: "C76"
    	},
    	{
    		word: "cto",
    		leet: "C70"
    	},
    	{
    		word: "cts",
    		leet: "C75"
    	},
    	{
    		word: "dab",
    		leet: "DAB"
    	},
    	{
    		word: "dad",
    		leet: "DAD"
    	},
    	{
    		word: "dae",
    		leet: "DAE"
    	},
    	{
    		word: "dag",
    		leet: "DA6"
    	},
    	{
    		word: "dah",
    		leet: "DA4"
    	},
    	{
    		word: "dal",
    		leet: "DA1"
    	},
    	{
    		word: "dao",
    		leet: "DA0"
    	},
    	{
    		word: "das",
    		leet: "DA5"
    	},
    	{
    		word: "dat",
    		leet: "DA7"
    	},
    	{
    		word: "dbl",
    		leet: "DB1"
    	},
    	{
    		word: "dca",
    		leet: "DCA"
    	},
    	{
    		word: "dcb",
    		leet: "DCB"
    	},
    	{
    		word: "ddt",
    		leet: "DD7"
    	},
    	{
    		word: "dea",
    		leet: "DEA"
    	},
    	{
    		word: "deb",
    		leet: "DEB"
    	},
    	{
    		word: "dec",
    		leet: "DEC"
    	},
    	{
    		word: "dee",
    		leet: "DEE"
    	},
    	{
    		word: "def",
    		leet: "DEF"
    	},
    	{
    		word: "deg",
    		leet: "DE6"
    	},
    	{
    		word: "dei",
    		leet: "DE1"
    	},
    	{
    		word: "del",
    		leet: "DE1"
    	},
    	{
    		word: "des",
    		leet: "DE5"
    	},
    	{
    		word: "det",
    		leet: "DE7"
    	},
    	{
    		word: "dft",
    		leet: "DF7"
    	},
    	{
    		word: "dha",
    		leet: "D4A"
    	},
    	{
    		word: "dia",
    		leet: "D1A"
    	},
    	{
    		word: "dib",
    		leet: "D1B"
    	},
    	{
    		word: "did",
    		leet: "D1D"
    	},
    	{
    		word: "die",
    		leet: "D1E"
    	},
    	{
    		word: "dif",
    		leet: "D1F"
    	},
    	{
    		word: "dig",
    		leet: "D16"
    	},
    	{
    		word: "dil",
    		leet: "D11"
    	},
    	{
    		word: "dis",
    		leet: "D15"
    	},
    	{
    		word: "dit",
    		leet: "D17"
    	},
    	{
    		word: "doa",
    		leet: "D0A"
    	},
    	{
    		word: "dob",
    		leet: "D0B"
    	},
    	{
    		word: "doc",
    		leet: "D0C"
    	},
    	{
    		word: "dod",
    		leet: "D0D"
    	},
    	{
    		word: "doe",
    		leet: "D0E"
    	},
    	{
    		word: "dog",
    		leet: "D06"
    	},
    	{
    		word: "doh",
    		leet: "D04"
    	},
    	{
    		word: "dol",
    		leet: "D01"
    	},
    	{
    		word: "doo",
    		leet: "D00"
    	},
    	{
    		word: "dos",
    		leet: "D05"
    	},
    	{
    		word: "dot",
    		leet: "D07"
    	},
    	{
    		word: "doz",
    		leet: "D02"
    	},
    	{
    		word: "dtd",
    		leet: "D7D"
    	},
    	{
    		word: "dzo",
    		leet: "D20"
    	},
    	{
    		word: "ead",
    		leet: "EAD"
    	},
    	{
    		word: "eat",
    		leet: "EA7"
    	},
    	{
    		word: "ebb",
    		leet: "EBB"
    	},
    	{
    		word: "ecb",
    		leet: "ECB"
    	},
    	{
    		word: "eco",
    		leet: "EC0"
    	},
    	{
    		word: "edh",
    		leet: "ED4"
    	},
    	{
    		word: "edo",
    		leet: "ED0"
    	},
    	{
    		word: "eds",
    		leet: "ED5"
    	},
    	{
    		word: "eel",
    		leet: "EE1"
    	},
    	{
    		word: "eff",
    		leet: "EFF"
    	},
    	{
    		word: "efl",
    		leet: "EF1"
    	},
    	{
    		word: "efs",
    		leet: "EF5"
    	},
    	{
    		word: "eft",
    		leet: "EF7"
    	},
    	{
    		word: "egg",
    		leet: "E66"
    	},
    	{
    		word: "ego",
    		leet: "E60"
    	},
    	{
    		word: "ela",
    		leet: "E1A"
    	},
    	{
    		word: "elb",
    		leet: "E1B"
    	},
    	{
    		word: "eld",
    		leet: "E1D"
    	},
    	{
    		word: "elf",
    		leet: "E1F"
    	},
    	{
    		word: "eli",
    		leet: "E11"
    	},
    	{
    		word: "ell",
    		leet: "E11"
    	},
    	{
    		word: "els",
    		leet: "E15"
    	},
    	{
    		word: "elt",
    		leet: "E17"
    	},
    	{
    		word: "eof",
    		leet: "E0F"
    	},
    	{
    		word: "eos",
    		leet: "E05"
    	},
    	{
    		word: "esc",
    		leet: "E5C"
    	},
    	{
    		word: "esd",
    		leet: "E5D"
    	},
    	{
    		word: "ese",
    		leet: "E5E"
    	},
    	{
    		word: "ess",
    		leet: "E55"
    	},
    	{
    		word: "est",
    		leet: "E57"
    	},
    	{
    		word: "eta",
    		leet: "E7A"
    	},
    	{
    		word: "etc",
    		leet: "E7C"
    	},
    	{
    		word: "eth",
    		leet: "E74"
    	},
    	{
    		word: "fab",
    		leet: "FAB"
    	},
    	{
    		word: "fac",
    		leet: "FAC"
    	},
    	{
    		word: "fad",
    		leet: "FAD"
    	},
    	{
    		word: "fae",
    		leet: "FAE"
    	},
    	{
    		word: "fag",
    		leet: "FA6"
    	},
    	{
    		word: "fas",
    		leet: "FA5"
    	},
    	{
    		word: "fat",
    		leet: "FA7"
    	},
    	{
    		word: "fbi",
    		leet: "FB1"
    	},
    	{
    		word: "fcs",
    		leet: "FC5"
    	},
    	{
    		word: "fec",
    		leet: "FEC"
    	},
    	{
    		word: "fed",
    		leet: "FED"
    	},
    	{
    		word: "fee",
    		leet: "FEE"
    	},
    	{
    		word: "feh",
    		leet: "FE4"
    	},
    	{
    		word: "fei",
    		leet: "FE1"
    	},
    	{
    		word: "fet",
    		leet: "FE7"
    	},
    	{
    		word: "fez",
    		leet: "FE2"
    	},
    	{
    		word: "ffa",
    		leet: "FFA"
    	},
    	{
    		word: "fib",
    		leet: "F1B"
    	},
    	{
    		word: "fid",
    		leet: "F1D"
    	},
    	{
    		word: "fie",
    		leet: "F1E"
    	},
    	{
    		word: "fig",
    		leet: "F16"
    	},
    	{
    		word: "fil",
    		leet: "F11"
    	},
    	{
    		word: "fit",
    		leet: "F17"
    	},
    	{
    		word: "fiz",
    		leet: "F12"
    	},
    	{
    		word: "flb",
    		leet: "F1B"
    	},
    	{
    		word: "fld",
    		leet: "F1D"
    	},
    	{
    		word: "fll",
    		leet: "F11"
    	},
    	{
    		word: "flo",
    		leet: "F10"
    	},
    	{
    		word: "fob",
    		leet: "F0B"
    	},
    	{
    		word: "fod",
    		leet: "F0D"
    	},
    	{
    		word: "foe",
    		leet: "F0E"
    	},
    	{
    		word: "fog",
    		leet: "F06"
    	},
    	{
    		word: "foh",
    		leet: "F04"
    	},
    	{
    		word: "fol",
    		leet: "F01"
    	},
    	{
    		word: "foo",
    		leet: "F00"
    	},
    	{
    		word: "fot",
    		leet: "F07"
    	},
    	{
    		word: "fth",
    		leet: "F74"
    	},
    	{
    		word: "gab",
    		leet: "6AB"
    	},
    	{
    		word: "gad",
    		leet: "6AD"
    	},
    	{
    		word: "gae",
    		leet: "6AE"
    	},
    	{
    		word: "gag",
    		leet: "6A6"
    	},
    	{
    		word: "gaj",
    		leet: "6A9"
    	},
    	{
    		word: "gal",
    		leet: "6A1"
    	},
    	{
    		word: "gas",
    		leet: "6A5"
    	},
    	{
    		word: "gat",
    		leet: "6A7"
    	},
    	{
    		word: "gaz",
    		leet: "6A2"
    	},
    	{
    		word: "gcd",
    		leet: "6CD"
    	},
    	{
    		word: "gds",
    		leet: "6D5"
    	},
    	{
    		word: "geb",
    		leet: "6EB"
    	},
    	{
    		word: "ged",
    		leet: "6ED"
    	},
    	{
    		word: "gee",
    		leet: "6EE"
    	},
    	{
    		word: "gel",
    		leet: "6E1"
    	},
    	{
    		word: "geo",
    		leet: "6E0"
    	},
    	{
    		word: "ges",
    		leet: "6E5"
    	},
    	{
    		word: "get",
    		leet: "6E7"
    	},
    	{
    		word: "gez",
    		leet: "6E2"
    	},
    	{
    		word: "ghi",
    		leet: "641"
    	},
    	{
    		word: "gib",
    		leet: "61B"
    	},
    	{
    		word: "gid",
    		leet: "61D"
    	},
    	{
    		word: "gie",
    		leet: "61E"
    	},
    	{
    		word: "gif",
    		leet: "61F"
    	},
    	{
    		word: "gig",
    		leet: "616"
    	},
    	{
    		word: "gil",
    		leet: "611"
    	},
    	{
    		word: "gio",
    		leet: "610"
    	},
    	{
    		word: "gis",
    		leet: "615"
    	},
    	{
    		word: "git",
    		leet: "617"
    	},
    	{
    		word: "glb",
    		leet: "61B"
    	},
    	{
    		word: "gld",
    		leet: "61D"
    	},
    	{
    		word: "glt",
    		leet: "617"
    	},
    	{
    		word: "goa",
    		leet: "60A"
    	},
    	{
    		word: "gob",
    		leet: "60B"
    	},
    	{
    		word: "god",
    		leet: "60D"
    	},
    	{
    		word: "gog",
    		leet: "606"
    	},
    	{
    		word: "goi",
    		leet: "601"
    	},
    	{
    		word: "gol",
    		leet: "601"
    	},
    	{
    		word: "goo",
    		leet: "600"
    	},
    	{
    		word: "gos",
    		leet: "605"
    	},
    	{
    		word: "got",
    		leet: "607"
    	},
    	{
    		word: "gtc",
    		leet: "67C"
    	},
    	{
    		word: "gtd",
    		leet: "67D"
    	},
    	{
    		word: "gte",
    		leet: "67E"
    	},
    	{
    		word: "gtt",
    		leet: "677"
    	},
    	{
    		word: "hab",
    		leet: "4AB"
    	},
    	{
    		word: "had",
    		leet: "4AD"
    	},
    	{
    		word: "hae",
    		leet: "4AE"
    	},
    	{
    		word: "haf",
    		leet: "4AF"
    	},
    	{
    		word: "hag",
    		leet: "4A6"
    	},
    	{
    		word: "hah",
    		leet: "4A4"
    	},
    	{
    		word: "haj",
    		leet: "4A9"
    	},
    	{
    		word: "hal",
    		leet: "4A1"
    	},
    	{
    		word: "hao",
    		leet: "4A0"
    	},
    	{
    		word: "has",
    		leet: "4A5"
    	},
    	{
    		word: "hat",
    		leet: "4A7"
    	},
    	{
    		word: "hcb",
    		leet: "4CB"
    	},
    	{
    		word: "hcf",
    		leet: "4CF"
    	},
    	{
    		word: "hcl",
    		leet: "4C1"
    	},
    	{
    		word: "hed",
    		leet: "4ED"
    	},
    	{
    		word: "hee",
    		leet: "4EE"
    	},
    	{
    		word: "heh",
    		leet: "4E4"
    	},
    	{
    		word: "hei",
    		leet: "4E1"
    	},
    	{
    		word: "hel",
    		leet: "4E1"
    	},
    	{
    		word: "heo",
    		leet: "4E0"
    	},
    	{
    		word: "hes",
    		leet: "4E5"
    	},
    	{
    		word: "het",
    		leet: "4E7"
    	},
    	{
    		word: "hgt",
    		leet: "467"
    	},
    	{
    		word: "hhd",
    		leet: "44D"
    	},
    	{
    		word: "hia",
    		leet: "41A"
    	},
    	{
    		word: "hic",
    		leet: "41C"
    	},
    	{
    		word: "hid",
    		leet: "41D"
    	},
    	{
    		word: "hie",
    		leet: "41E"
    	},
    	{
    		word: "his",
    		leet: "415"
    	},
    	{
    		word: "hit",
    		leet: "417"
    	},
    	{
    		word: "hld",
    		leet: "41D"
    	},
    	{
    		word: "hob",
    		leet: "40B"
    	},
    	{
    		word: "hoc",
    		leet: "40C"
    	},
    	{
    		word: "hod",
    		leet: "40D"
    	},
    	{
    		word: "hoe",
    		leet: "40E"
    	},
    	{
    		word: "hog",
    		leet: "406"
    	},
    	{
    		word: "hoi",
    		leet: "401"
    	},
    	{
    		word: "hol",
    		leet: "401"
    	},
    	{
    		word: "hoo",
    		leet: "400"
    	},
    	{
    		word: "hot",
    		leet: "407"
    	},
    	{
    		word: "hsi",
    		leet: "451"
    	},
    	{
    		word: "hts",
    		leet: "475"
    	},
    	{
    		word: "iao",
    		leet: "1A0"
    	},
    	{
    		word: "iba",
    		leet: "1BA"
    	},
    	{
    		word: "ibo",
    		leet: "1B0"
    	},
    	{
    		word: "ice",
    		leet: "1CE"
    	},
    	{
    		word: "ich",
    		leet: "1C4"
    	},
    	{
    		word: "ida",
    		leet: "1DA"
    	},
    	{
    		word: "ide",
    		leet: "1DE"
    	},
    	{
    		word: "ido",
    		leet: "1D0"
    	},
    	{
    		word: "ids",
    		leet: "1D5"
    	},
    	{
    		word: "ife",
    		leet: "1FE"
    	},
    	{
    		word: "iff",
    		leet: "1FF"
    	},
    	{
    		word: "ifs",
    		leet: "1F5"
    	},
    	{
    		word: "ihi",
    		leet: "141"
    	},
    	{
    		word: "ihs",
    		leet: "145"
    	},
    	{
    		word: "iii",
    		leet: "111"
    	},
    	{
    		word: "ijo",
    		leet: "190"
    	},
    	{
    		word: "ila",
    		leet: "11A"
    	},
    	{
    		word: "ile",
    		leet: "11E"
    	},
    	{
    		word: "ill",
    		leet: "111"
    	},
    	{
    		word: "iof",
    		leet: "10F"
    	},
    	{
    		word: "ios",
    		leet: "105"
    	},
    	{
    		word: "ise",
    		leet: "15E"
    	},
    	{
    		word: "ish",
    		leet: "154"
    	},
    	{
    		word: "isl",
    		leet: "151"
    	},
    	{
    		word: "iso",
    		leet: "150"
    	},
    	{
    		word: "ist",
    		leet: "157"
    	},
    	{
    		word: "isz",
    		leet: "152"
    	},
    	{
    		word: "ita",
    		leet: "17A"
    	},
    	{
    		word: "itd",
    		leet: "17D"
    	},
    	{
    		word: "ito",
    		leet: "170"
    	},
    	{
    		word: "its",
    		leet: "175"
    	},
    	{
    		word: "jab",
    		leet: "9AB"
    	},
    	{
    		word: "jad",
    		leet: "9AD"
    	},
    	{
    		word: "jag",
    		leet: "9A6"
    	},
    	{
    		word: "jah",
    		leet: "9A4"
    	},
    	{
    		word: "jai",
    		leet: "9A1"
    	},
    	{
    		word: "jat",
    		leet: "9A7"
    	},
    	{
    		word: "jcl",
    		leet: "9C1"
    	},
    	{
    		word: "jct",
    		leet: "9C7"
    	},
    	{
    		word: "jed",
    		leet: "9ED"
    	},
    	{
    		word: "jee",
    		leet: "9EE"
    	},
    	{
    		word: "jef",
    		leet: "9EF"
    	},
    	{
    		word: "jeg",
    		leet: "9E6"
    	},
    	{
    		word: "jet",
    		leet: "9E7"
    	},
    	{
    		word: "jib",
    		leet: "91B"
    	},
    	{
    		word: "jig",
    		leet: "916"
    	},
    	{
    		word: "job",
    		leet: "90B"
    	},
    	{
    		word: "joe",
    		leet: "90E"
    	},
    	{
    		word: "jog",
    		leet: "906"
    	},
    	{
    		word: "jos",
    		leet: "905"
    	},
    	{
    		word: "jot",
    		leet: "907"
    	},
    	{
    		word: "lab",
    		leet: "1AB"
    	},
    	{
    		word: "lac",
    		leet: "1AC"
    	},
    	{
    		word: "lad",
    		leet: "1AD"
    	},
    	{
    		word: "lag",
    		leet: "1A6"
    	},
    	{
    		word: "lah",
    		leet: "1A4"
    	},
    	{
    		word: "lai",
    		leet: "1A1"
    	},
    	{
    		word: "lao",
    		leet: "1A0"
    	},
    	{
    		word: "las",
    		leet: "1A5"
    	},
    	{
    		word: "lat",
    		leet: "1A7"
    	},
    	{
    		word: "laz",
    		leet: "1A2"
    	},
    	{
    		word: "lbf",
    		leet: "1BF"
    	},
    	{
    		word: "lbs",
    		leet: "1B5"
    	},
    	{
    		word: "lca",
    		leet: "1CA"
    	},
    	{
    		word: "lcd",
    		leet: "1CD"
    	},
    	{
    		word: "ldg",
    		leet: "1D6"
    	},
    	{
    		word: "lea",
    		leet: "1EA"
    	},
    	{
    		word: "led",
    		leet: "1ED"
    	},
    	{
    		word: "lee",
    		leet: "1EE"
    	},
    	{
    		word: "leg",
    		leet: "1E6"
    	},
    	{
    		word: "lei",
    		leet: "1E1"
    	},
    	{
    		word: "leo",
    		leet: "1E0"
    	},
    	{
    		word: "les",
    		leet: "1E5"
    	},
    	{
    		word: "let",
    		leet: "1E7"
    	},
    	{
    		word: "lhb",
    		leet: "14B"
    	},
    	{
    		word: "lhd",
    		leet: "14D"
    	},
    	{
    		word: "lib",
    		leet: "11B"
    	},
    	{
    		word: "lid",
    		leet: "11D"
    	},
    	{
    		word: "lie",
    		leet: "11E"
    	},
    	{
    		word: "lif",
    		leet: "11F"
    	},
    	{
    		word: "lig",
    		leet: "116"
    	},
    	{
    		word: "lis",
    		leet: "115"
    	},
    	{
    		word: "lit",
    		leet: "117"
    	},
    	{
    		word: "liz",
    		leet: "112"
    	},
    	{
    		word: "llb",
    		leet: "11B"
    	},
    	{
    		word: "loa",
    		leet: "10A"
    	},
    	{
    		word: "lob",
    		leet: "10B"
    	},
    	{
    		word: "loc",
    		leet: "10C"
    	},
    	{
    		word: "lod",
    		leet: "10D"
    	},
    	{
    		word: "loe",
    		leet: "10E"
    	},
    	{
    		word: "lof",
    		leet: "10F"
    	},
    	{
    		word: "log",
    		leet: "106"
    	},
    	{
    		word: "loo",
    		leet: "100"
    	},
    	{
    		word: "lot",
    		leet: "107"
    	},
    	{
    		word: "lsc",
    		leet: "15C"
    	},
    	{
    		word: "lst",
    		leet: "157"
    	},
    	{
    		word: "oad",
    		leet: "0AD"
    	},
    	{
    		word: "oaf",
    		leet: "0AF"
    	},
    	{
    		word: "oat",
    		leet: "0A7"
    	},
    	{
    		word: "oba",
    		leet: "0BA"
    	},
    	{
    		word: "obb",
    		leet: "0BB"
    	},
    	{
    		word: "obe",
    		leet: "0BE"
    	},
    	{
    		word: "obi",
    		leet: "0B1"
    	},
    	{
    		word: "obj",
    		leet: "0B9"
    	},
    	{
    		word: "obl",
    		leet: "0B1"
    	},
    	{
    		word: "obs",
    		leet: "0B5"
    	},
    	{
    		word: "oca",
    		leet: "0CA"
    	},
    	{
    		word: "och",
    		leet: "0C4"
    	},
    	{
    		word: "oct",
    		leet: "0C7"
    	},
    	{
    		word: "oda",
    		leet: "0DA"
    	},
    	{
    		word: "odd",
    		leet: "0DD"
    	},
    	{
    		word: "ode",
    		leet: "0DE"
    	},
    	{
    		word: "ods",
    		leet: "0D5"
    	},
    	{
    		word: "odz",
    		leet: "0D2"
    	},
    	{
    		word: "oes",
    		leet: "0E5"
    	},
    	{
    		word: "off",
    		leet: "0FF"
    	},
    	{
    		word: "ofo",
    		leet: "0F0"
    	},
    	{
    		word: "oft",
    		leet: "0F7"
    	},
    	{
    		word: "oho",
    		leet: "040"
    	},
    	{
    		word: "ohs",
    		leet: "045"
    	},
    	{
    		word: "oie",
    		leet: "01E"
    	},
    	{
    		word: "oii",
    		leet: "011"
    	},
    	{
    		word: "oil",
    		leet: "011"
    	},
    	{
    		word: "ola",
    		leet: "01A"
    	},
    	{
    		word: "old",
    		leet: "01D"
    	},
    	{
    		word: "ole",
    		leet: "01E"
    	},
    	{
    		word: "oof",
    		leet: "00F"
    	},
    	{
    		word: "ooh",
    		leet: "004"
    	},
    	{
    		word: "oos",
    		leet: "005"
    	},
    	{
    		word: "oot",
    		leet: "007"
    	},
    	{
    		word: "osc",
    		leet: "05C"
    	},
    	{
    		word: "ose",
    		leet: "05E"
    	},
    	{
    		word: "osi",
    		leet: "051"
    	},
    	{
    		word: "otc",
    		leet: "07C"
    	},
    	{
    		word: "oto",
    		leet: "070"
    	},
    	{
    		word: "ozs",
    		leet: "025"
    	},
    	{
    		word: "saa",
    		leet: "5AA"
    	},
    	{
    		word: "sab",
    		leet: "5AB"
    	},
    	{
    		word: "sac",
    		leet: "5AC"
    	},
    	{
    		word: "sad",
    		leet: "5AD"
    	},
    	{
    		word: "sae",
    		leet: "5AE"
    	},
    	{
    		word: "sag",
    		leet: "5A6"
    	},
    	{
    		word: "sah",
    		leet: "5A4"
    	},
    	{
    		word: "sai",
    		leet: "5A1"
    	},
    	{
    		word: "saj",
    		leet: "5A9"
    	},
    	{
    		word: "sal",
    		leet: "5A1"
    	},
    	{
    		word: "sao",
    		leet: "5A0"
    	},
    	{
    		word: "sat",
    		leet: "5A7"
    	},
    	{
    		word: "scf",
    		leet: "5CF"
    	},
    	{
    		word: "sch",
    		leet: "5C4"
    	},
    	{
    		word: "sci",
    		leet: "5C1"
    	},
    	{
    		word: "sct",
    		leet: "5C7"
    	},
    	{
    		word: "sds",
    		leet: "5D5"
    	},
    	{
    		word: "sea",
    		leet: "5EA"
    	},
    	{
    		word: "sec",
    		leet: "5EC"
    	},
    	{
    		word: "sed",
    		leet: "5ED"
    	},
    	{
    		word: "see",
    		leet: "5EE"
    	},
    	{
    		word: "seg",
    		leet: "5E6"
    	},
    	{
    		word: "sei",
    		leet: "5E1"
    	},
    	{
    		word: "sel",
    		leet: "5E1"
    	},
    	{
    		word: "set",
    		leet: "5E7"
    	},
    	{
    		word: "sfz",
    		leet: "5F2"
    	},
    	{
    		word: "sgd",
    		leet: "56D"
    	},
    	{
    		word: "sha",
    		leet: "54A"
    	},
    	{
    		word: "she",
    		leet: "54E"
    	},
    	{
    		word: "shh",
    		leet: "544"
    	},
    	{
    		word: "shi",
    		leet: "541"
    	},
    	{
    		word: "sho",
    		leet: "540"
    	},
    	{
    		word: "sht",
    		leet: "547"
    	},
    	{
    		word: "sia",
    		leet: "51A"
    	},
    	{
    		word: "sib",
    		leet: "51B"
    	},
    	{
    		word: "sic",
    		leet: "51C"
    	},
    	{
    		word: "sid",
    		leet: "51D"
    	},
    	{
    		word: "sie",
    		leet: "51E"
    	},
    	{
    		word: "sig",
    		leet: "516"
    	},
    	{
    		word: "sil",
    		leet: "511"
    	},
    	{
    		word: "sis",
    		leet: "515"
    	},
    	{
    		word: "sit",
    		leet: "517"
    	},
    	{
    		word: "sla",
    		leet: "51A"
    	},
    	{
    		word: "sld",
    		leet: "51D"
    	},
    	{
    		word: "slt",
    		leet: "517"
    	},
    	{
    		word: "sob",
    		leet: "50B"
    	},
    	{
    		word: "soc",
    		leet: "50C"
    	},
    	{
    		word: "sod",
    		leet: "50D"
    	},
    	{
    		word: "soe",
    		leet: "50E"
    	},
    	{
    		word: "sog",
    		leet: "506"
    	},
    	{
    		word: "soh",
    		leet: "504"
    	},
    	{
    		word: "sol",
    		leet: "501"
    	},
    	{
    		word: "sos",
    		leet: "505"
    	},
    	{
    		word: "sot",
    		leet: "507"
    	},
    	{
    		word: "ssi",
    		leet: "551"
    	},
    	{
    		word: "sta",
    		leet: "57A"
    	},
    	{
    		word: "std",
    		leet: "57D"
    	},
    	{
    		word: "stg",
    		leet: "576"
    	},
    	{
    		word: "taa",
    		leet: "7AA"
    	},
    	{
    		word: "tab",
    		leet: "7AB"
    	},
    	{
    		word: "tad",
    		leet: "7AD"
    	},
    	{
    		word: "tae",
    		leet: "7AE"
    	},
    	{
    		word: "tag",
    		leet: "7A6"
    	},
    	{
    		word: "tai",
    		leet: "7A1"
    	},
    	{
    		word: "taj",
    		leet: "7A9"
    	},
    	{
    		word: "tal",
    		leet: "7A1"
    	},
    	{
    		word: "tao",
    		leet: "7A0"
    	},
    	{
    		word: "tas",
    		leet: "7A5"
    	},
    	{
    		word: "tat",
    		leet: "7A7"
    	},
    	{
    		word: "tbs",
    		leet: "7B5"
    	},
    	{
    		word: "tch",
    		leet: "7C4"
    	},
    	{
    		word: "tea",
    		leet: "7EA"
    	},
    	{
    		word: "tec",
    		leet: "7EC"
    	},
    	{
    		word: "ted",
    		leet: "7ED"
    	},
    	{
    		word: "tee",
    		leet: "7EE"
    	},
    	{
    		word: "tef",
    		leet: "7EF"
    	},
    	{
    		word: "teg",
    		leet: "7E6"
    	},
    	{
    		word: "tel",
    		leet: "7E1"
    	},
    	{
    		word: "tez",
    		leet: "7E2"
    	},
    	{
    		word: "tgt",
    		leet: "767"
    	},
    	{
    		word: "tha",
    		leet: "74A"
    	},
    	{
    		word: "the",
    		leet: "74E"
    	},
    	{
    		word: "tho",
    		leet: "740"
    	},
    	{
    		word: "tib",
    		leet: "71B"
    	},
    	{
    		word: "tic",
    		leet: "71C"
    	},
    	{
    		word: "tid",
    		leet: "71D"
    	},
    	{
    		word: "tie",
    		leet: "71E"
    	},
    	{
    		word: "tig",
    		leet: "716"
    	},
    	{
    		word: "til",
    		leet: "711"
    	},
    	{
    		word: "tis",
    		leet: "715"
    	},
    	{
    		word: "tit",
    		leet: "717"
    	},
    	{
    		word: "tji",
    		leet: "791"
    	},
    	{
    		word: "tlo",
    		leet: "710"
    	},
    	{
    		word: "toa",
    		leet: "70A"
    	},
    	{
    		word: "tob",
    		leet: "70B"
    	},
    	{
    		word: "tod",
    		leet: "70D"
    	},
    	{
    		word: "toe",
    		leet: "70E"
    	},
    	{
    		word: "tog",
    		leet: "706"
    	},
    	{
    		word: "toi",
    		leet: "701"
    	},
    	{
    		word: "tol",
    		leet: "701"
    	},
    	{
    		word: "too",
    		leet: "700"
    	},
    	{
    		word: "tos",
    		leet: "705"
    	},
    	{
    		word: "tot",
    		leet: "707"
    	},
    	{
    		word: "tsi",
    		leet: "751"
    	},
    	{
    		word: "tss",
    		leet: "755"
    	},
    	{
    		word: "tst",
    		leet: "757"
    	},
    	{
    		word: "zac",
    		leet: "2AC"
    	},
    	{
    		word: "zad",
    		leet: "2AD"
    	},
    	{
    		word: "zag",
    		leet: "2A6"
    	},
    	{
    		word: "zat",
    		leet: "2A7"
    	},
    	{
    		word: "zea",
    		leet: "2EA"
    	},
    	{
    		word: "zed",
    		leet: "2ED"
    	},
    	{
    		word: "zee",
    		leet: "2EE"
    	},
    	{
    		word: "zel",
    		leet: "2E1"
    	},
    	{
    		word: "zho",
    		leet: "240"
    	},
    	{
    		word: "zig",
    		leet: "216"
    	},
    	{
    		word: "zit",
    		leet: "217"
    	},
    	{
    		word: "zoa",
    		leet: "20A"
    	},
    	{
    		word: "zod",
    		leet: "20D"
    	},
    	{
    		word: "zoo",
    		leet: "200"
    	}
    ];

    const app = new App({
      target: document.body,
      props: {
        words,
      },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
