import ExecutionEnvironment from "@docusaurus/ExecutionEnvironment"

if(ExecutionEnvironment.canUseDOM) {
  window.__routeTransitionLastPathname = window.location.pathname
}

/**
 * Restarts the fadeIn animation on route changes.
 *
 * @param {object} params - The route update parameters.
 * @param {object} params.location - The new location object.
 * @returns {void}
 */
export function onRouteDidUpdate({location}) {
  if(location.pathname === window.__routeTransitionLastPathname) {
    return
  }

  window.__routeTransitionLastPathname = location.pathname
  const main = document.querySelector("main")
  if(main) {
    main.classList.remove("route-transition")
    // Force reflow to restart the animation
    void main.offsetHeight
    main.classList.add("route-transition")
  }
}
