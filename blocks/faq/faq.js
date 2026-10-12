import { moveInstrumentation } from '../../scripts/scripts.js';

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
    if (i === 0) details.open = true;

    const summary = document.createElement('summary');
    summary.textContent = questionCell?.textContent.trim() || '';
    moveInstrumentation(questionCell, summary);
    const answer = document.createElement('div');
    answer.className = 'faq-answer';
    if (answerCell) {
      moveInstrumentation(answerCell, answer);
      while (answerCell.firstChild) answer.append(answerCell.firstChild);
    }
    details.append(summary, answer);
    list.append(details);
  });
  content.push(list);
  block.replaceChildren(...content);
}
