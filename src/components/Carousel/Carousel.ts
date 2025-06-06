import { matchMediaController } from '@/scripts/develop/matchMediaController';
import { register, type SwiperContainer } from 'swiper/element/bundle';

register();

const breakpoints = {
  md: '48em',
  lg: '75em',
};

const carouselElements = Array.from(document.querySelectorAll('.js-carousel'));
carouselElements.forEach((carousel) => {
  const swiperElement: SwiperContainer | null = carousel.querySelector('[data-role="swiper"]');
  const prevButton: HTMLButtonElement | null = carousel.querySelector('[data-role="prev"]');
  const nextButton: HTMLButtonElement | null = carousel.querySelector('[data-role="next"]');

  if (!swiperElement) return;

  swiperElement.initialize();

  const goNext = () => {
    if (swiperElement) swiperElement.swiper.slideNext();
  };

  const goPrev = () => {
    if (swiperElement) swiperElement.swiper.slidePrev();
  };

  nextButton?.addEventListener('click', goNext);
  prevButton?.addEventListener('click', goPrev);

  const changeButtonState = (element: SwiperContainer) => {
    if (element.swiper.isEnd) {
      nextButton?.setAttribute('disabled', 'true');
    } else {
      nextButton?.removeAttribute('disabled');
    }
    if (element.swiper.isBeginning) {
      prevButton?.setAttribute('disabled', 'true');
    } else {
      prevButton?.removeAttribute('disabled');
    }
  };

  swiperElement.swiper.on('slideChange', () => {
    changeButtonState(swiperElement);
  });
  changeButtonState(swiperElement);

  matchMediaController().init({
    condition: `(width <= ${breakpoints.md})`,
    callback: (match) => {
      if (match) {
        if (swiperElement) swiperElement.slidesPerView = 1;
      }
    },
  });
  matchMediaController().init({
    condition: `(${breakpoints.md} < width <= ${breakpoints.lg})`,
    callback: (match) => {
      if (match) {
        if (swiperElement) swiperElement.slidesPerView = 2;
      }
    },
  });
  matchMediaController().init({
    condition: `(width > ${breakpoints.lg})`,
    callback: (match) => {
      if (match) {
        if (swiperElement) swiperElement.slidesPerView = 3;
      }
    },
  });
});
