type Props = {
  butonSelector: string;
  modalSelector: string;
};

// TODO:
// いったんハードコーディング
// cssとの分割管理
const closeModal = (modal: HTMLDialogElement) => {
  modal.classList.add('-back');
  setTimeout(() => {
    modal.close();
    modal.classList.remove('-back');
  }, 300);
};

export const ModalMenu = () => {
  return {
    init: (props?: Props) => {
      const { butonSelector, modalSelector } = props
        ? props
        : { butonSelector: '.js-modal-button', modalSelector: '.js-modal' };

      const modalButtons = Array.from(document.querySelectorAll(butonSelector));
      modalButtons.forEach((button) => {
        const modalId = button.getAttribute('data-modal-id') || '';
        const modal: HTMLDialogElement | null = document.getElementById(modalId) as HTMLDialogElement;
        button.addEventListener('click', () => {
          if (modal) {
            modal.showModal();
          }
        });

        window.addEventListener(
          'keydown',
          (event) => {
            if (!modal || !modal.open) return;
            if (event.defaultPrevented) return;
            if (event.key === 'Esc' || event.key === 'Escape') {
              event.preventDefault();
              closeModal(modal);
            }
          },
          true,
        );
      });

      const modalElements: Array<HTMLDialogElement> = Array.from(document.querySelectorAll(modalSelector));
      modalElements.forEach((modal) => {
        const closeButton = modal.querySelector('button[data-role="close"]');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            closeModal(modal);
          });
        }
        modal.addEventListener('click', (event) => {
          if (event.target === modal) {
            closeModal(modal);
          }
        });
      });
    },
  };
};

ModalMenu().init();
