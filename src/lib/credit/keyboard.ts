// True when the event target is an element that should receive the keystroke
// itself (typing or activating), so global shortcuts must not hijack it.
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return true
  if (target.isContentEditable) return true
  if (target.getAttribute("contenteditable") === "true" || target.getAttribute("contenteditable") === "") {
    return true
  }
  if (target.getAttribute("role") === "button") return true
  return false
}
