// Lightweight pub/sub for letter data mutations.
// Any component that changes a letter (status, dispatch, create, edit, delete)
// should call notifyLettersChanged(). Any component showing aggregated counts
// (Dashboard) should subscribe via onLettersChanged().

const EVENT = 'purc-letters-changed';

export function notifyLettersChanged() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onLettersChanged(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
