import EmblaCarousel from 'embla-carousel';
import { addDotBtnsAndClickHandlers } from './CarouselPagination';
import { addPrevNextBtnsClickHandlers } from './CrouselControls';

const emblaNode = document.querySelector('.embla');
const options: OptionsType = { containScroll: false };
const dotsNode = emblaNode?.querySelector('.embla__dots');
const prevBtnNode = emblaNode?.querySelector('.embla__button--prev');
const nextBtnNode = emblaNode?.querySelector('.embla__button--next');

const emblaApi = EmblaCarousel(emblaNode as unknown as HTMLElement, options);
// console.log(emblaApi.slideNodes()); // Access API

const removeDotBtnsAndClickHandlers = addDotBtnsAndClickHandlers(emblaApi, dotsNode as HTMLElement);

const removePrevNextBtnsClickHandlers = addPrevNextBtnsClickHandlers(
  emblaApi,
  prevBtnNode as HTMLElement,
  nextBtnNode as HTMLElement,
);

emblaApi.on('destroy', removeDotBtnsAndClickHandlers);
emblaApi.on('destroy', removePrevNextBtnsClickHandlers);
