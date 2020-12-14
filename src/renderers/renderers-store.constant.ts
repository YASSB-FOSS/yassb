import { basicElement } from '@yassb/renderers/built-in/basic-element.function';
import { liDateDescription } from '@yassb/renderers/built-in/li-date-description.function';
import { RenderersStore } from '@yassb/yassb';

/**
 * Store where all renderers are stored by their name as the `key`.
 * Custom renderers are added to this store during the setup.
 * In this way the logi to call a built-in renderer or a custom one is the same.
 */
export const RENDERERS_STORE: RenderersStore = {
  basicElement,
  liDateDescription
};
