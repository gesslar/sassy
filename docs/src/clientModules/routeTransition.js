import ExecutionEnvironment from "@docusaurus/ExecutionEnvironment"

if(ExecutionEnvironment.canUseDOM) {
  let lastPathname = window.location.pathname

  const observer = new MutationObserver(() => {
    const current = window.location.pathname
    if(current !== lastPathname) {
      lastPathname = current
      const main = document.querySelector("main")
      if(main) {
        main.style.animation = "none"
        // Force reflow to restart the animation
        void main.offsetHeight
        main.style.animation = ""
      }
    }
  })

  observer.observe(document.body, {childList: true, subtree: true})
}
