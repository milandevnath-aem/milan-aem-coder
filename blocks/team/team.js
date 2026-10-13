import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

/**
 * People list (photo + details). Each row: photo, text (badge line, name heading, role).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const [imageCell, textCell] = row.children;
    const item = document.createElement('li');
    item.className = 'team-member';
    moveInstrumentation(row, item);

    const img = imageCell?.querySelector('img');
    if (img) {
      const picture = createPicture(img.src, img.alt, false, [{ width: '640' }]);
      moveInstrumentation(img, picture.querySelector('img'));
      picture.className = 'team-photo';
      item.append(picture);
    }
    if (textCell) {
      textCell.className = 'team-details';
      // the paragraph before the name is a small badge (e.g. DIN number)
      const heading = textCell.querySelector('h2, h3, h4');
      const badge = heading?.previousElementSibling;
      if (badge?.tagName === 'P') badge.classList.add('team-badge');
      item.append(textCell);
    }
    list.append(item);
  });
  block.replaceChildren(list);
}
