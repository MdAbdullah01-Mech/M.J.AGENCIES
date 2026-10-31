(function () {
  const allowedStatuses = ['New', 'Contacted', 'Quoted', 'Completed'];
  let clientPromise;

  function cleanText(value, maxLength) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
  }

  function getSupabaseGlobal() {
    return window.supabase && window.supabase.createClient ? window.supabase : null;
  }

  async function loadConfig() {
    if (window.MJ_SUPABASE_CONFIG) return window.MJ_SUPABASE_CONFIG;

    if (window.location.protocol === 'file:') {
      throw new Error('Supabase is not configured for direct file opening. Use Netlify, netlify dev, or add config.local.js for local testing.');
    }

    const response = await fetch('/.netlify/functions/supabase-config', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify.');
    }

    return response.json();
  }

  async function getClient() {
    if (!clientPromise) {
      clientPromise = (async () => {
        const supabaseGlobal = getSupabaseGlobal();
        if (!supabaseGlobal) throw new Error('Supabase library failed to load.');

        const config = await loadConfig();
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
          throw new Error('Supabase URL or anon key is missing.');
        }

        return supabaseGlobal.createClient(config.supabaseUrl, config.supabaseAnonKey);
      })();
    }

    return clientPromise;
  }

  function validateEnquiry(input) {
    const enquiry = {
      customer_name: cleanText(input.customer_name, 120),
      phone: cleanText(input.phone, 30),
      product_name: cleanText(input.product_name, 160),
      required_quantity: cleanText(input.required_quantity, 80),
      message: cleanText(input.message, 1000),
    };

    if (!enquiry.customer_name) throw new Error('Please enter your name.');
    if (!/^[0-9+\-\s()]{7,20}$/.test(enquiry.phone)) throw new Error('Please enter a valid phone number.');
    if (!enquiry.product_name) throw new Error('Please enter the product name.');
    if (!enquiry.required_quantity) throw new Error('Please enter the required quantity.');

    return enquiry;
  }

  async function submitEnquiry(input) {
    const client = await getClient();
    const enquiry = validateEnquiry(input);
    const { error } = await client.from('enquiries').insert(enquiry);
    if (error) throw new Error(error.message || 'Unable to submit enquiry.');
    return { ok: true };
  }

  async function signIn(email, password) {
    const client = await getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Unable to sign in.');
    return data;
  }

  async function signOut() {
    const client = await getClient();
    await client.auth.signOut();
  }

  async function getSession() {
    const client = await getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error(error.message || 'Unable to read session.');
    return data.session;
  }

  async function listEnquiries() {
    const client = await getClient();
    const { data, error } = await client
      .from('enquiries')
      .select('id, customer_name, phone, product_name, required_quantity, message, status, submitted_at, updated_at')
      .order('submitted_at', { ascending: false });

    if (error) throw new Error(error.message || 'Unable to load enquiries.');
    return data || [];
  }

  async function updateEnquiryStatus(id, status) {
    if (!allowedStatuses.includes(status)) throw new Error('Invalid status.');

    const client = await getClient();
    const { error } = await client
      .from('enquiries')
      .update({ status })
      .eq('id', id);

    if (error) throw new Error(error.message || 'Unable to update status.');
  }

  window.MJEnquiries = {
    allowedStatuses,
    getClient,
    submitEnquiry,
    signIn,
    signOut,
    getSession,
    listEnquiries,
    updateEnquiryStatus,
  };
})();
