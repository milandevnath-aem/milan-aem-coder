export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // a first column holding only a heading becomes a narrow title column
  const first = cols[0];
  if (cols.length === 2 && first?.children.length === 1 && first.querySelector(':scope > h1, :scope > h2, :scope > h3')) {
    block.classList.add('columns-split');
  }

  if (block.classList.contains('about-us') && block.classList.contains('columns-split')) {
    // a paragraph holding only a URL link (text = address) is a website link with a globe icon
    cols[1].querySelectorAll(':scope > p > a[href]:only-child').forEach((a) => {
      const p = a.parentElement;
      if (p.textContent.trim() !== a.textContent.trim()) return;
      try {
        if (new URL(a.href).href !== new URL(a.textContent.trim(), window.location).href) return;
      } catch { return; }
      p.classList.add('columns-website');
    });

    // the heading sits in a track it sticks within (desktop): the column's height, or down
    // to the end of a team list placed right after this block (e.g. "Promoters")
    const track = document.createElement('div');
    track.className = 'columns-sticky';
    track.append(...first.childNodes);
    first.append(track);
    const team = block.parentElement?.nextElementSibling;
    if (team?.matches('.team-wrapper')) {
      const update = () => {
        const end = team.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
        first.style.setProperty('--sticky-end', `${Math.max(0, end)}px`);
      };
      const observer = new ResizeObserver(update);
      observer.observe(block);
      observer.observe(team);
    }
  }

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });
}
