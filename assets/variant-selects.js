class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateVariantId();
    this.toggleAddButton(true);
    this.updatePickupAvailability();
    this.removeErrorMessage();

    if (!this.currentVariant) {
      this.toggleAddButton(true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
    }

    this.dispatchEvent(
      new CustomEvent(PUB_SUB_EVENTS.variantChange, {
        bubbles: true,
        detail: {
          currentVariant: this.currentVariant,
          sectionId: this.currentVariant.id,
        },
      }),
    );
  }

  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll('select'),
      (select) => select.value,
    );
  }

  updateVariantId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant || !this.currentVariant.featured_media) return;

    // Update main product image
    const mainImage = document.querySelectorAll('[data-main-image]');
    if (!mainImage) {
      console.log('Could not find main product image element');
      return;
    }

    // Update the main image src with the new variant's featured media
    mainImage.forEach((image) => {
      image.src =
        this.currentVariant.featured_media.preview_image.src.replace(
          /\?.*/,
          '',
        ) + '?width=750';
    });

    // Update the thumbnail navigation
    const imageNav = document.querySelector('.product__media__image-nav');
    if (!imageNav) {
      console.log('Could not find image navigation element');
      return;
    }

    // Remove active class from current thumbnail
    const currentActive = imageNav.querySelector('.product-media__item.active');
    if (currentActive) {
      currentActive.classList.remove('active');
    }

    // Find and activate the matching thumbnail
    const thumbnails = imageNav.querySelectorAll('.product-media__item');
    thumbnails.forEach((thumbnail) => {
      const thumbnailImg = thumbnail.querySelector('img');
      if (
        thumbnailImg &&
        thumbnailImg.src.includes(this.currentVariant.featured_media.id)
      ) {
        thumbnail.classList.add('active');
      }
    });
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState(
      {},
      '',
      `${this.dataset.url}?variant=${this.currentVariant.id}`,
    );
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#Product-Form-${this.dataset.section}, #Product-Form-Installment-${this.dataset.section}`,
    );

    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;

    fetch(
      `${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`,
    )
      .then((response) => response.text())
      .then((responseText) => {
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(
          `Price-${this.dataset.section}`,
        );
        const source = html.getElementById(`Price-${this.dataset.section}`);

        const stickyPriceDestination = document.getElementById(
          `StickyPrice-${this.dataset.section}`,
        );
        const stickyPriceSource = html.getElementById(
          `StickyPrice-${this.dataset.section}`,
        );

        const stickyAddToCartDestination = document.getElementById(
          `StickyAddToCart-${this.dataset.section}`,
        );
        const stickyAddToCartSource = html.getElementById(
          `StickyAddToCart-${this.dataset.section}`,
        );

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (stickyPriceSource && stickyPriceDestination)
          stickyPriceDestination.innerHTML = stickyPriceSource.innerHTML;
        if (stickyAddToCartSource && stickyAddToCartDestination)
          stickyAddToCartDestination.innerHTML =
            stickyAddToCartSource.innerHTML;

        const price = document.getElementById(`Price-${this.dataset.section}`);

        if (price) price.classList.remove('visibility-hidden');

        this.toggleAddButton(
          !this.currentVariant.available,
          window.variantStrings.soldOut,
        );
      });
  }

  toggleAddButton(disable = true, text) {
    const productForm = document.getElementById(
      `Product-Form-${this.dataset.section}`,
    );
    if (!productForm) return;

    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');

    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = window.variantStrings.addToCart;
    }
  }

  setUnavailable() {
    const button = document.getElementById(
      `Product-Form-${this.dataset.section}`,
    );
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`Price-${this.dataset.section}`);

    if (!addButton) return;

    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('visibility-hidden');
  }

  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
      pickUpAvailability.removeAttribute('available');
    } else {
      pickUpAvailability.innerHTML = '';
    }
  }
}
customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find(
        (radio) => radio.checked,
      ).value;
    });
  }
}

customElements.define('variant-radios', VariantRadios);
