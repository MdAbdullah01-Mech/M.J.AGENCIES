// M . J . AGENCIES website interactions, cart, and Supabase enquiries.
// Prices in products.html are DEMO prices. Replace them before publishing.

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

const CART_KEY = 'mjAgenciesCartV1';
let cart = readCart();
function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch { return {}; }
}
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* local storage may be disabled */ }
  renderCart();
}
function formatINR(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}
function productFromCard(card) {
  const title = card.querySelector('h3')?.textContent.trim() || 'Product';
  const price = Number(card.dataset.price || 0);
  const unit = card.dataset.unit || 'unit';
  const image = card.querySelector('img')?.getAttribute('src') || '';
  return { id: card.dataset.productId, title, price, unit, image };
}
function addProduct(id) {
  const card = document.querySelector(`[data-product-id="${CSS.escape(id)}"]`);
  if (!card) return;
  const product = productFromCard(card);
  if (cart[id]) cart[id].quantity += 1;
  else cart[id] = { ...product, quantity: 1 };
  saveCart();
  const status = document.getElementById('cart-enquiry-status');
  if (status) status.textContent = `${product.title} added to your cart.`;
}
document.querySelectorAll('[data-add-product]').forEach((button) => {
  button.addEventListener('click', () => addProduct(button.dataset.addProduct));
});

function renderCart() {
  const container = document.getElementById('cart-items');
  const empty = document.getElementById('cart-empty');
  const totalNode = document.getElementById('cart-total');
  const countNodes = document.querySelectorAll('#cart-count');
  const entries = Object.values(cart);
  const count = entries.reduce((sum, item) => sum + item.quantity, 0);
  countNodes.forEach((node) => { node.textContent = String(count); });
  if (!container || !empty || !totalNode) return;
  container.replaceChildren();
  empty.hidden = entries.length > 0;
  let total = 0;
  entries.forEach((item) => {
    const line = document.createElement('article');
    line.className = 'cart-item';
    const details = document.createElement('div');
    details.className = 'cart-item-details';
    const title = document.createElement('h4'); title.textContent = item.title;
    const unit = document.createElement('p'); unit.textContent = `${formatINR(item.price)} ${item.unit}`;
    details.append(title, unit);
    const controls = document.createElement('div'); controls.className = 'cart-item-controls';
    const quantityLabel = document.createElement('label'); quantityLabel.className = 'quantity-label'; quantityLabel.textContent = 'Qty ';
    const quantity = document.createElement('input'); quantity.type = 'number'; quantity.min = '1'; quantity.step = '1'; quantity.value = String(item.quantity); quantity.setAttribute('aria-label', `Quantity for ${item.title}`);
    quantity.addEventListener('change', () => {
      const next = Math.floor(Number(quantity.value));
      if (!Number.isFinite(next) || next < 1) { delete cart[item.id]; } else { cart[item.id].quantity = Math.min(next, 9999); }
      saveCart();
    });
    quantityLabel.append(quantity);
    const lineTotal = document.createElement('strong'); lineTotal.textContent = formatINR(item.price * item.quantity);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-item'; remove.textContent = 'Remove';
    remove.addEventListener('click', () => { delete cart[item.id]; saveCart(); });
    controls.append(quantityLabel, lineTotal, remove);
    line.append(details, controls); container.append(line);
    total += item.price * item.quantity;
  });
  totalNode.textContent = formatINR(total);
}
renderCart();

function getSupabaseClient() {
  const config = window.MJ_SUPABASE_CONFIG;
  if (!config || !config.url || !config.anonKey || config.url.includes('YOUR_SUPABASE') || config.anonKey.includes('YOUR_SUPABASE')) return null;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
  if (!window.__mjSupabaseClient) window.__mjSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
  return window.__mjSupabaseClient;
}
function setStatus(node, message, isError = false) {
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('error', isError);
  node.classList.toggle('success', !isError && Boolean(message));
}
async function insertEnquiry(payload, statusNode, submitButton) {
  const client = getSupabaseClient();
  if (!client) {
    setStatus(statusNode, 'Supabase is not configured yet. Add your Project URL and publishable/anon key in supabase-config.js, then try again.', true);
    return false;
  }
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Sending…'; }
  setStatus(statusNode, 'Sending your enquiry…');
  try {
    const { error } = await client.from('enquiries').insert(payload);
    if (error) throw error;
    setStatus(statusNode, 'Enquiry submitted successfully. M . J . AGENCIES can now review it. Please confirm final stock and pricing with the shop.');
    return true;
  } catch (error) {
    console.error('Supabase enquiry error:', error);
    setStatus(statusNode, `Could not submit the enquiry: ${error.message || 'check your connection and Supabase table/policies'}`, true);
    return false;
  } finally {
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = submitButton.dataset.originalText || 'Submit Enquiry'; }
  }
}

const contactForm = document.getElementById('enquiry-form');
if (contactForm) {
  const submitButton = contactForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.dataset.originalText = submitButton.textContent;
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const payload = {
      customer_name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim() || null,
      requirement: String(data.get('requirement') || '').trim(),
      message: String(data.get('message') || '').trim() || null,
      delivery_area: null,
      items: [],
      estimated_total: 0,
      source: 'contact_page'
    };
    const ok = await insertEnquiry(payload, document.getElementById('contact-enquiry-status') || contactForm.querySelector('.form-status'), submitButton);
    if (ok) contactForm.reset();
  });
}

const cartForm = document.getElementById('cart-enquiry-form');
if (cartForm) {
  const submitButton = cartForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.dataset.originalText = submitButton.textContent;
  cartForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const items = Object.values(cart);
    const status = document.getElementById('cart-enquiry-status');
    if (!items.length) { setStatus(status, 'Add at least one product to your cart before submitting.', true); return; }
    const data = new FormData(cartForm);
    const estimatedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const payload = {
      customer_name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim() || null,
      requirement: 'Shopping cart quotation',
      message: [String(data.get('message') || '').trim(), `Delivery area: ${String(data.get('delivery_area') || '').trim() || 'Not provided'}`].filter(Boolean).join('\n') || null,
      delivery_area: String(data.get('delivery_area') || '').trim() || null,
      items: items.map(({ id, title, price, unit, quantity }) => ({ id, title, unit_price_demo: price, unit, quantity, line_total_demo: price * quantity })),
      estimated_total: estimatedTotal,
      source: 'shopping_cart'
    };
    const ok = await insertEnquiry(payload, status, submitButton);
    if (ok) { cart = {}; saveCart(); cartForm.reset(); }
  });
}
