export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // a first column holding only a heading becomes a narrow title column
  const first = cols[0];
  if (cols.length === 2 && first?.children.length === 1 && first.querySelector(':scope > h1, :scope > h2, :scope > h3')) {
    block.classList.add('columns-split');
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
