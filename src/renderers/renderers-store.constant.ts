import type { RenderersStore } from '../yassb';
import { basicElement } from './built-in/basic-element.function';
import { liDateDescription } from './built-in/li-date-description.function';

/**
 * Renderers that ship with YASSB.
 *
 * @featurePart api.custom-renderers
 */
export const BUILT_IN_RENDERERS: RenderersStore = {
  basicElement,
  liDateDescription
};

/**
 * All renderers by name: the built-in ones plus `config.customRenderers` (added by `setupYassb`).
 * A custom renderer with the name of a built-in one replaces it.
 *
 * @internal
 */
export const RENDERERS_STORE: RenderersStore = { ...BUILT_IN_RENDERERS };

/**
 * @internal
 */
export function resetRenderersStore(custom: RenderersStore = {}): void {
  for (const name of Object.keys(RENDERERS_STORE))
    delete RENDERERS_STORE[name];
  Object.assign(RENDERERS_STORE, BUILT_IN_RENDERERS, custom);
}
