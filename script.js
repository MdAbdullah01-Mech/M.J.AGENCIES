const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isOpen));
    siteNav.classList.toggle('open');
  });
}

const filterButtons = document.querySelectorAll('.filter-button');
const catalogCategories = document.querySelectorAll('.catalog-category[data-category]');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    catalogCategories.forEach((category) => {
      category.hidden = filter !== 'all' && category.dataset.category !== filter;
    });
  });
});

function setFormStatus(form, message, type) {
  const status = form.querySelector('.form-status');
  if (!status) return;

  status.textContent = message;
  status.className = `form-status ${type || ''}`.trim();
}

function setButtonLoading(button, isLoading) {
  if (!button) return;
  if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
  button.disabled = isLoading;
  button.textContent = isLoading ? 'Sending...' : button.dataset.originalText;
}

async function handleEnquirySubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const honeypot = form.querySelector('[name="website"]');

  if (honeypot && honeypot.value.trim()) {
    form.reset();
    setFormStatus(form, 'Thank you. Your enquiry has been received.', 'success');
    return;
  }

  const formData = new FormData(form);
  const payload = {
    customer_name: formData.get('name'),
    phone: formData.get('phone'),
    product_name: formData.get('product_name') || formData.get('product'),
    required_quantity: formData.get('required_quantity'),
    message: formData.get('message'),
  };

  try {
    setButtonLoading(button, true);
    setFormStatus(form, '', '');

    if (!window.MJEnquiries) {
      throw new Error('Enquiry service is not loaded. Please check the Supabase setup.');
    }

    await window.MJEnquiries.submitEnquiry(payload);
    form.classList.add('sent');
    form.reset();
    setFormStatus(form, 'Thank you. Your enquiry has been submitted successfully.', 'success');
  } catch (error) {
    setFormStatus(form, error.message || 'Unable to submit enquiry. Please try again.', 'error');
  } finally {
    setButtonLoading(button, false);
  }
}

function createProductEnquiryForm(productName) {
  const wrapper = document.createElement('details');
  wrapper.className = 'product-enquiry';

  const summary = document.createElement('summary');
  summary.textContent = 'Enquire Now';
  wrapper.appendChild(summary);

  const form = document.createElement('form');
  form.className = 'product-enquiry-form';
  form.action = '#';
  form.method = 'post';
  form.innerHTML = `
    <input type="hidden" name="product_name" value="">
    <label>
      Customer Name
      <input type="text" name="name" autocomplete="name" required>
    </label>
    <label>
      Phone Number
      <input type="tel" name="phone" autocomplete="tel" required>
    </label>
    <label>
      Required Quantity
      <input type="text" name="required_quantity" placeholder="Example: 10 bags / 1 ton" required>
    </label>
    <label>
      Message
      <textarea name="message" rows="3" placeholder="Delivery area, preferred brand, or other details"></textarea>
    </label>
    <label class="hp-field" aria-hidden="true">
      Leave this field empty
      <input type="text" name="website" tabindex="-1" autocomplete="off">
    </label>
    <button class="button primary" type="submit">Submit Enquiry</button>
    <p class="form-status" role="status"></p>
  `;

  form.querySelector('[name="product_name"]').value = productName;
  form.addEventListener('submit', handleEnquirySubmit);
  wrapper.appendChild(form);

  return wrapper;
}

document.querySelectorAll('.product-card').forEach((card) => {
  const title = card.querySelector('h3');
  const body = card.querySelector('div');
  if (!title || !body || card.querySelector('.product-enquiry')) return;
  body.appendChild(createProductEnquiryForm(title.textContent.trim()));
});

document.querySelectorAll('.contact-form').forEach((form) => {
  form.addEventListener('submit', handleEnquirySubmit);
});
