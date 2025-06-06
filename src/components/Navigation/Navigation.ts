import { getEasingFunction } from '@/scripts/develop/getEasingFunction';
import { matchMediaController } from '@/scripts/develop/matchMediaController';
import { scrollController } from '@/scripts/develop/scrollController';
const _scrollController = scrollController();

type Props = {
  selector: string;
  breakpoint: string;
};

export const NavigationMenu = () => {
  const elements: {
    navigation: HTMLElement | null;
    bg: HTMLElement | null | undefined;
    openButton: HTMLElement | null | undefined;
    closeButton: HTMLElement | null | undefined;
    contents: HTMLElement | null | undefined;
    trap: HTMLElement | null | undefined;
  } = {
    navigation: null,
    bg: null,
    openButton: null,
    closeButton: null,
    contents: null,
    trap: null,
  };

  const states = {
    isOpen: false,
    isMoving: false,
    isDisabled: false,
  };

  const options = {
    disabledClass: '-is-disabled',
  };

  const animationSettings = {
    duration: 300,
    easing: getEasingFunction('easeOutCirc'),
  };

  const setCloseEnd = () => {
    states.isOpen = false;
    states.isMoving = false;
    elements.bg?.setAttribute('aria-hidden', 'true');
    elements.contents?.setAttribute('aria-hidden', 'true');
    _scrollController.release();
    elements.openButton?.focus();
  };

  const setDisabled = (match: boolean) => {
    states.isDisabled = match;
    if (states.isDisabled && states.isOpen) {
      setCloseEnd();
    }
    elements.navigation?.classList.toggle(options.disabledClass, states.isDisabled);
  };

  const getState = () => {
    return {
      start: { opacity: 0 },
      end: { opacity: 1 },
    };
  };

  const close = () => {
    states.isMoving = true;
    elements.contents?.animate([]).cancel();
    elements.contents?.animate([getState().end, getState().start], animationSettings);
    elements.bg?.animate([]).cancel();
    const bg = elements.bg?.animate([getState().end, getState().start], animationSettings);
    if (bg)
      bg.onfinish = () => {
        setCloseEnd();
      };
  };

  const open = () => {
    states.isMoving = true;
    states.isOpen = true;
    _scrollController.lock();
    elements.contents?.setAttribute('aria-hidden', 'false');
    elements.contents?.animate([getState().start, getState().end], animationSettings);
    elements.bg?.setAttribute('aria-hidden', 'false');
    const bg = elements.bg?.animate([getState().start, getState().end], animationSettings);
    if (bg)
      bg.onfinish = () => {
        states.isMoving = false;
      };
  };

  const onClickHandler = () => {
    if (states.isMoving || states.isDisabled) return;
    if (states.isOpen) {
      close();
    } else {
      open();
    }
  };

  return {
    init: (props?: Props) => {
      const { selector, breakpoint } = props ? props : { selector: '#js-navigation', breakpoint: '48em' };

      elements.navigation = document.querySelector(selector);
      elements.bg = elements.navigation?.querySelector('[data-role="bg"]');
      elements.openButton = elements.navigation?.querySelector('[data-role="open"]');
      elements.closeButton = elements.navigation?.querySelector('[data-role="close"]');
      elements.contents = elements.navigation?.querySelector('[data-role="contents"]');
      elements.trap = elements.navigation?.querySelector('[data-role="trap"]');

      elements.openButton?.addEventListener('click', onClickHandler);
      [elements.bg, elements.closeButton].forEach((element) => {
        element?.addEventListener('click', onClickHandler);
      });

      matchMediaController().init({
        condition: `(width > ${breakpoint})`,
        callback: (match) => {
          setDisabled(match);
        },
      });

      window.addEventListener(
        'keydown',
        (event) => {
          if (states.isDisabled || !states.isOpen) return;
          if (event.defaultPrevented) return;
          if (event.key === 'Esc' || event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        },
        true,
      );

      elements.trap?.addEventListener('focus', () => {
        elements.closeButton?.focus();
      });

      if (elements.contents) {
        const samePageLinks = Array.from(elements.contents.querySelectorAll('a[href^="#"]'));
        if (samePageLinks && samePageLinks.length > 0) {
          samePageLinks.forEach((link) => {
            link.addEventListener('click', () => {
              if (!states.isDisabled && states.isOpen) close();
            });
          });
        }
      }

      _scrollController.init();
    },
  };
};

NavigationMenu().init();
