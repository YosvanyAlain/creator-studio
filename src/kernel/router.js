/* Stack router: five root tabs, each with its own history; views are plain objects. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const views = new Map();
  const stacks = { home: [], learn: [], create: [], projects: [], settings: [] };
  let tab = 'home';
  let current = null;
  let currentNode = null;
  let host = null;
  let renderToken = 0;
  let disposers = [];

  function dispose() {
    for (const off of disposers) { try { off(); } catch (error) { /* ignore */ } }
    disposers = [];
  }

  /* A view: { tab, title(params) -> string, render(params, ctx) -> Node, leave?(), actions?(params) -> Node[], wide?, chrome? } */
  function register(name, view) {
    if (views.has(name)) throw new Error('view registered twice: ' + name);
    views.set(name, Object.assign({ name }, view));
  }

  function attach(root) { host = root; }

  async function leaveCurrent() {
    if (current && current.view.leave) {
      try {
        const ok = await current.view.leave(current.params);
        if (ok === false) return false;
      } catch (error) { console.error(error); }
    }
    return true;
  }

  async function show(entry, direction) {
    const view = views.get(entry.name);
    if (!view) throw new Error('unknown view: ' + entry.name);
    const token = ++renderToken;
    const keepScroll = direction === 'keep' ? host.scrollTop : 0;
    dispose();
    current = { view, params: entry.params || {}, name: entry.name };
    const alive = () => token === renderToken;
    const ctx = {
      token, alive,
      refresh: () => alive() && show(entry, 'keep'),
      on(event, fn) { const off = CS.bus.on(event, (payload) => { if (alive()) fn(payload); }); disposers.push(off); return off; }
    };
    if (view.refreshOn) {
      let timer = null;
      for (const event of view.refreshOn) {
        disposers.push(CS.bus.on(event, () => {
          clearTimeout(timer);
          timer = setTimeout(() => { if (alive()) show(entry, 'keep'); }, 60);
        }));
      }
      disposers.push(() => clearTimeout(timer));
    }
    let node;
    try {
      node = await view.render(current.params, ctx);
    } catch (error) {
      console.error(error);
      node = CS.ui ? CS.ui.errorState(error) : CS.h('pre', {}, String(error && error.stack || error));
    }
    if (token !== renderToken) return;
    const wrapper = CS.h('div', { class: ['view', view.wide && 'view-wide', view.flush && 'view-flush', direction && direction !== 'keep' && 'enter-' + direction] }, node);
    if (currentNode && currentNode.parentNode) currentNode.remove();
    host.appendChild(wrapper);
    currentNode = wrapper;
    host.scrollTop = keepScroll;
    if (direction === 'keep') return;
    CS.bus.emit('route', { name: entry.name, params: current.params, tab, depth: stacks[tab].length, view });
  }

  async function go(name, params, options) {
    const view = views.get(name);
    if (!view) throw new Error('unknown view: ' + name);
    if (!(await leaveCurrent())) return;
    const opts = options || {};
    const targetTab = view.tab || tab;
    if (targetTab !== tab) tab = targetTab;
    const stack = stacks[tab];
    if (opts.replace && stack.length) stack[stack.length - 1] = { name, params: params || {} };
    else if (view.root) stack.splice(0, stack.length, { name, params: params || {} });
    else if (!stack.length) stack.push({ name: rootOf(tab), params: {} }, { name, params: params || {} });
    else stack.push({ name, params: params || {} });
    await show(stack[stack.length - 1], opts.replace ? 'none' : view.root ? 'fade' : 'push');
  }

  async function switchTab(name) {
    if (!(await leaveCurrent())) return;
    if (name === tab && stacks[name].length > 1) stacks[name].splice(1);
    tab = name;
    if (!stacks[name].length) stacks[name].push({ name: rootOf(name), params: {} });
    await show(stacks[name][stacks[name].length - 1], 'fade');
  }

  function rootOf(tabName) {
    for (const [name, view] of views) if (view.root && view.tab === tabName) return name;
    return 'home';
  }

  async function back() {
    const stack = stacks[tab];
    if (stack.length <= 1) {
      if (tab !== 'home') return switchTab('home');
      return false;
    }
    if (!(await leaveCurrent())) return true;
    stack.pop();
    await show(stack[stack.length - 1], 'pop');
    return true;
  }

  function refresh() {
    const stack = stacks[tab];
    if (stack.length) return show(stack[stack.length - 1], 'keep');
  }

  CS.router = {
    register, attach, go, back, switchTab, refresh,
    get tab() { return tab; },
    get current() { return current; },
    get depth() { return stacks[tab].length; },
    has: (name) => views.has(name),
    views: () => [...views.keys()]
  };
})();
