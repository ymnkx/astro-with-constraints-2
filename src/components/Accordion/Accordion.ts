import { slideDown, slideUp } from '@/scripts/develop/slideController';

type Props = {
  selector: string;
};

export const AccordionMenu = () => {
  const elements: {
    accordions: Array<HTMLDetailsElement>;
  } = {
    accordions: [],
  };

  const closeSameNameAccordion = (item: HTMLDetailsElement) => {
    const name = item.dataset.name;
    if (!name) return;
    const details: Array<HTMLDetailsElement> = elements.accordions.filter((item) => item.dataset.name === name); // Array.from(document.querySelectorAll(`details[data-name="${name}"]`));
    details.forEach((detail: HTMLDetailsElement) => {
      if (detail !== item && detail.open) {
        const contentsElement: HTMLElement | null = detail.querySelector('[data-role="contents"]');
        if (!contentsElement) return;
        detail.setAttribute('data-status', 'closing');
        slideUp({
          element: contentsElement,
          callback: () => {
            detail.removeAttribute('open');
            detail.setAttribute('data-status', '');
          },
        });
      }
    });
  };

  const setFunction = (item: HTMLDetailsElement) => {
    const summaryElement = item?.querySelector('[data-role="summary"]');
    const contentsElement: HTMLElement | null = item?.querySelector('[data-role="contents"]');
    if (!summaryElement || !contentsElement) return;

    summaryElement?.addEventListener('click', (ev) => {
      ev.preventDefault();

      if (item.open) {
        item.setAttribute('data-status', 'closing');
        slideUp({
          element: contentsElement,
          callback: () => {
            item.removeAttribute('open');
            item.setAttribute('data-status', '');
          },
        });
      } else {
        closeSameNameAccordion(item);
        item.setAttribute('open', 'true');
        slideDown({
          element: contentsElement,
        });
      }
    });
  };

  return {
    init: (props?: Props) => {
      const { selector } = props ? props : { selector: '.js-accordion' };
      elements.accordions = Array.from(document.querySelectorAll(selector));
      if (!elements.accordions || elements.accordions.length === 0) return;
      elements.accordions.forEach((item) => {
        setFunction(item);
      });
    },
  };
};

AccordionMenu().init();
