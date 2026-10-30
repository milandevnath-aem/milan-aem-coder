import { createDropdown } from './dropdown.js';

/**
 * Turns "label paragraph + list of links" in a text cell into a dropdown; the CTA
 * (button link) after it opens the selected option's link.
 * @param {Element} block a Columns block with the "dropdown-cta" variant
 */
function decorateTextDropdown(block) {
  block.querySelectorAll('ul:not([hidden])').forEach((list) => {
    const items = [...list.querySelectorAll(':scope > li')];
    const links = items.map((li) => li.querySelector('a[href]'));
    if (!items.length || links.some((a) => !a)) return;

    // the position is the value: links can repeat, and the selection must not depend on them
    const options = links.map((a, i) => ({ value: String(i), label: a.textContent.trim() }));
    const prev = list.previousElementSibling;
    const label = prev?.matches('p') ? prev : null;
    const dropdown = createDropdown({
      label: label?.textContent.trim() || 'Select',
      name: 'option',
      options,
      value: options[0].value,
    });
    dropdown.classList.add('columns-dropdown');
    // authored nodes stay (hidden) so the Universal Editor keeps its instrumentation
    if (label) label.hidden = true;
    list.hidden = true;
    (label || list).before(dropdown);

    const cta = dropdown.parentElement.querySelector('a.button');
    if (!cta) return;
    const update = () => {
      cta.href = links[Number(dropdown.value)].href;
      cta.target = '_blank';
      cta.rel = 'noopener';
    };
    update();
    dropdown.addEventListener('change', update);
  });
}

/**
 * @param {Element} main The main element
 */
export default function decorateTextDropdowns(main) {
  main.querySelectorAll('.columns.dropdown-cta').forEach(decorateTextDropdown);
}
