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

// description paragraph, info chip (paragraph with an icon) and heading + list note card
function decorateIntro(intro) {
  const children = [...intro.children];
  let hasDescription = false;
  children.forEach((el, i) => {
    if (el.tagName === 'P' && el.querySelector('.icon')) {
      el.classList.add('faq-intro-info');
    } else if (el.tagName === 'P' && !hasDescription) {
      el.classList.add('faq-intro-description');
      hasDescription = true;
    } else if (el.tagName === 'H3' && children[i + 1]?.tagName === 'UL') {
      const list = children[i + 1];
      const note = document.createElement('div');
      note.className = 'faq-intro-note';
      el.className = 'faq-intro-note-title';
      list.className = 'faq-intro-note-list';
      el.before(note);
      note.append(el, list);
    }
  });
}

// expand/collapse the answer by animating its height
function animateItem(details, expand) {
  const answer = details.querySelector('.faq-answer');
  answer.getAnimations().forEach((a) => a.cancel());
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !answer.animate) {
    details.open = expand;
    return;
  }
  if (expand) details.open = true;
  else details.classList.add('is-closing');
  const full = `${answer.offsetHeight}px`;
  const frames = expand ? ['0px', full] : [full, '0px'];
  const animation = answer.animate(
    { height: frames, opacity: expand ? [0, 1] : [1, 0] },
    { duration: 250, easing: 'ease-in-out' },
  );
  animation.onfinish = () => {
    details.open = expand;
    details.classList.remove('is-closing');
  };
  animation.oncancel = () => details.classList.remove('is-closing');
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
    decorateIntro(intro);
    content.push(intro);
  }

  const list = document.createElement('div');
  list.className = 'faq-list';
  rows.filter((row) => row !== headingRow).forEach((row, i) => {
    const [questionCell, answerCell] = row.children;
    const details = document.createElement('details');
    details.className = 'faq-item';
    moveInstrumentation(row, details);
    // if (i === 0 && block.classList.contains('open-state')) details.open = true;
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
    // summary is natively keyboard operable (Enter/Space); intercept to animate
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (details.open && !details.classList.contains('is-closing')) {
        animateItem(details, false);
      } else if (!details.open) {
        list.querySelectorAll('details.faq-item[open]').forEach((other) => {
          if (other !== details) animateItem(other, false);
        });
        animateItem(details, true);
      }
    });
    details.append(summary, answer);
    list.append(details);
  });
  content.push(list);
  block.replaceChildren(...content);
}
