// add delayed functionality here
import { loadScript } from './aem.js';
import { loadGtm } from './analytics.js';

/**
 * Adds the DWAO accessibility widget: the button container first, then the widget script,
 * which fills in the button's icon and label. Not tied to cookie consent on purpose.
 */
function loadAccessibilityWidget() {
  if (document.getElementById('accessibilityToggleBtn')) return;

  const container = document.createElement('div');
  container.className = 'accessibility-div';
  const button = document.createElement('button');
  button.id = 'accessibilityToggleBtn';
  container.append(button);
  document.body.append(container);

  loadScript(`${window.hlx.codeBasePath}/scripts/dwao-a11y-widget.js`, {
    'data-position': 'bottom-left',
  });
}

loadGtm();
loadAccessibilityWidget();
