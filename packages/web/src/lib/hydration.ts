// Whether React has hydrated a component: for a component whose server HTML has to work before
// any of its JavaScript runs, and then differently once it does.
import * as React from "react";

const subscribe = () => () => {};
const yes = () => true;
const no = () => false;

type BooleanStore = (
  subscribe: (onChange: () => void) => () => void,
  getSnapshot: () => boolean,
  getServerSnapshot: () => boolean,
) => boolean;

// Server Components get a React without client hooks. Nothing there is hydrated, so the answer
// is the server's. Which React a module gets never changes, so the hooks a component calls
// are the same on every render.
const useBooleanStore: BooleanStore =
  React.useSyncExternalStore ??
  ((_subscribe, _getSnapshot, getServerSnapshot) => getServerSnapshot());

/**
 * Whether React has hydrated the calling component. It is false while React renders the
 * component on a server and while it hydrates that HTML, and true on the render that follows.
 * A component that React first renders in the browser is hydrated from the start.
 *
 * Pass `needed` as false when the component would render the same either way: the answer is
 * then true everywhere, so that the component is not rendered a second time after hydration.
 */
export function useHydrated(needed = true): boolean {
  return useBooleanStore(subscribe, yes, needed ? no : yes);
}
