import { moveInstrumentation } from '../../scripts/scripts.js';

const HEADING_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P'];

// wrap each heading/p + ul pair (and standalone ul) in a group so they can be styled as cards
function groupAnswerContent(container) {
  const children = [...container.children];
  let i = 0;
  while (i < children.length) {
    const el = children[i];
    const next = children[i + 1];
    if (HEADING_TAGS.includes(el.tagName) && next?.tagName === 'UL') {
      const group = document.createElement('div');
      group.className = 'faq-group';
      el.className = 'faq-group-title';
      next.className = 'faq-group-list';
      el.before(group);
      group.append(el, next);
      i += 2;
    } else if (el.tagName === 'UL') {
      const group = document.createElement('div');
      group.className = 'faq-group no-heading';
      el.className = 'faq-group-list';
      el.before(group);
      group.append(el);
      i += 1;
    } else {
      i += 1;
    }
  }
}

/**
 * FAQ accordion with the heading beside it on desktop.
 * Optional first single-cell row: heading. Other rows: question, answer.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const headingRow = rows.find((row) => row.children.length === 1);
  const content = [];

  if (headingRow?.textContent.trim()) {
    const intro = headingRow.firstElementChild;
    intro.className = 'faq-intro';
    moveInstrumentation(headingRow, intro);
    content.push(intro);
  }

  const list = document.createElement('div');
  list.className = 'faq-list';
  rows.filter((row) => row !== headingRow).forEach((row, i) => {
    const [questionCell, answerCell] = row.children;
    const details = document.createElement('details');
    details.className = 'faq-item';
    moveInstrumentation(row, details);
    if (i === 0 && block.classList.contains('open-state')) details.open = true;

    const summary = document.createElement('summary');
    summary.textContent = questionCell?.textContent.trim() || '';
    moveInstrumentation(questionCell, summary);
    const answer = document.createElement('div');
    answer.className = 'faq-answer';
    if (answerCell) {
      moveInstrumentation(answerCell, answer);
      while (answerCell.firstChild) answer.append(answerCell.firstChild);
    }
    // keep the count line visible in the summary when the item is collapsed
    if (block.classList.contains('item-count') && answer.firstElementChild?.tagName === 'P') {
      const count = answer.firstElementChild;
      count.classList.add('faq-item-count');
      summary.append(count);
    }
    const isTable = block.classList.contains('grouped-table');
    if (isTable || block.classList.contains('grouped-content')) groupAnswerContent(answer);
    if (isTable) {
      // header row + longest column, so groups share row tracks via subgrid
      const lists = [...answer.querySelectorAll('.faq-group-list')];
      const rowCount = 1 + Math.max(0, ...lists.map((ul) => ul.children.length));
      answer.style.setProperty('--faq-table-rows', rowCount);
    }
    details.append(summary, answer);
    list.append(details);
  });
  content.push(list);
  block.replaceChildren(...content);
}
