class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.content =
      this.mainDetailsToggle.querySelector('summary').nextElementSibling;

    this.mainDetailsToggle.addEventListener(
      'focusout',
      this.onFocusOut.bind(this),
    );
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));

    // Close when clicking/tapping outside the menu. This replaces the part
    // of the focusout behaviour that previously handled outside clicks —
    // pointerdown fires before any focus change, so it cannot race the
    // link-click navigation the way focusout did.
    document.addEventListener('pointerdown', (event) => {
      if (
        this.mainDetailsToggle.hasAttribute('open') &&
        !this.contains(event.target)
      ) {
        this.close();
      }
    });

    // Add overlay click handler
    const overlay = this.content.querySelector('.mega-menu__overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.close();
      });
    }
  }

  onFocusOut() {
    setTimeout(() => {
      const active = document.activeElement;
      // In Safari and Firefox, clicking an <a> does NOT move focus to it —
      // document.activeElement falls back to <body> mid-click. Closing the
      // menu in that window hides the link between mousedown and mouseup
      // and swallows the navigation entirely (menu closes, nothing happens).
      // Only close on real focus departures (e.g. tabbing out); outside
      // clicks are handled by the document pointerdown listener.
      if (active !== document.body && !this.contains(active)) this.close();
    });
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle
      .querySelector('summary')
      .setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');

    // Handle nested dropdowns
    this.nestedDetails = this.querySelectorAll('details-disclosure');
    this.nestedDetails.forEach((nestedDetail) => {
      const details = nestedDetail.querySelector('details');
      const summary = details.querySelector('summary');

      // Add click event to prevent navigation when clicking on summary
      summary.addEventListener('click', (event) => {
        if (summary.tagName === 'SUMMARY') {
          event.preventDefault();
          details.hasAttribute('open')
            ? details.removeAttribute('open')
            : details.setAttribute('open', '');
        }
      });

      // Add overlay click handler for nested dropdowns
      const overlay = nestedDetail.querySelector('.mega-menu__overlay');
      if (overlay) {
        overlay.addEventListener('click', () => {
          nestedDetail.close();
        });
      }
    });
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (
      document.documentElement.style.getPropertyValue(
        '--header-bottom-position-desktop',
      ) !== ''
    )
      return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`,
    );
  }
}

customElements.define('header-menu', HeaderMenu);
