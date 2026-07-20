/**
 * router.js
 * ---------------------------------------------------------------------------
 * A small stack navigator (batches → subjects → topics → content) rather
 * than a URL router — this matches a drill-down study app better than
 * hash routes, while still integrating with the hardware/browser back
 * gesture via history.pushState.
 * ---------------------------------------------------------------------------
 */

const Router = (() => {
  const stack = []; // [{screenId, render}]
  const root = () => document.getElementById("screen-stack");

  function render(screen) {
    const el = document.createElement("section");
    el.className = "screen";
    el.dataset.screen = screen.id;
    el.innerHTML = screen.html;
    root().appendChild(el);
    requestAnimationFrame(() => el.classList.add("screen--enter"));
    screen.onMount?.(el);
    UI.lazyObserve(el);
    return el;
  }

  function push(screen) {
    history.pushState({ depth: stack.length + 1 }, "");
    stack.push(screen);
    const el = render(screen);
    // Slide the previous screen back a touch for depth.
    const prev = root().children[root().children.length - 2];
    if (prev) prev.classList.add("screen--recede");
    return el;
  }

  function pop() {
    if (stack.length === 0) return;
    stack.pop();
    const nodes = root().children;
    const top = nodes[nodes.length - 1];
    if (top) {
      top.classList.add("screen--exit");
      top.addEventListener("transitionend", () => top.remove(), { once: true });
    }
    const prev = nodes[nodes.length - 2];
    if (prev) prev.classList.remove("screen--recede");
  }

  function reset(screen) {
    stack.length = 0;
    root().innerHTML = "";
    stack.push(screen);
    render(screen);
  }

  window.addEventListener("popstate", () => {
    if (stack.length > 1) pop();
  });

  return { push, pop, reset, get depth() { return stack.length; } };
})();
