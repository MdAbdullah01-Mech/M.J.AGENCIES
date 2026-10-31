(function () {
  const loginSection = document.getElementById('admin-login');
  const dashboardSection = document.getElementById('admin-dashboard');
  const loginForm = document.querySelector('.admin-login-form');
  const tableBody = document.getElementById('enquiries-table');
  const searchInput = document.getElementById('admin-search');
  const statusFilter = document.getElementById('admin-status-filter');
  const refreshButton = document.getElementById('admin-refresh');
  const signoutButton = document.getElementById('admin-signout');
  const adminMessage = document.getElementById('admin-message');
  let enquiries = [];

  function setStatus(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = `form-status ${type || ''}`.trim();
  }

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  function showDashboard(show) {
    loginSection.hidden = show;
    dashboardSection.hidden = !show;
  }

  function filteredEnquiries() {
    const search = (searchInput.value || '').trim().toLowerCase();
    const status = statusFilter.value;

    return enquiries.filter((item) => {
      const matchesStatus = status === 'all' || item.status === status;
      const text = [
        item.customer_name,
        item.phone,
        item.product_name,
        item.required_quantity,
        item.message,
      ].join(' ').toLowerCase();
      return matchesStatus && (!search || text.includes(search));
    });
  }

  function renderTable() {
    tableBody.textContent = '';

    const rows = filteredEnquiries();
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = 'No enquiries found.';
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    rows.forEach((item) => {
      const tr = document.createElement('tr');
      const cells = [
        formatDate(item.submitted_at),
        item.customer_name,
        item.phone,
        item.product_name,
        item.required_quantity,
        item.message || '',
      ];

      cells.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });

      const statusTd = document.createElement('td');
      const select = document.createElement('select');
      window.MJEnquiries.allowedStatuses.forEach((status) => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        option.selected = item.status === status;
        select.appendChild(option);
      });

      select.addEventListener('change', async () => {
        try {
          await window.MJEnquiries.updateEnquiryStatus(item.id, select.value);
          item.status = select.value;
          setStatus(adminMessage, 'Status updated.', 'success');
          renderTable();
        } catch (error) {
          setStatus(adminMessage, error.message || 'Unable to update status.', 'error');
          select.value = item.status;
        }
      });

      statusTd.appendChild(select);
      tr.appendChild(statusTd);
      tableBody.appendChild(tr);
    });
  }

  async function loadEnquiries() {
    setStatus(adminMessage, 'Loading enquiries...', '');
    enquiries = await window.MJEnquiries.listEnquiries();
    setStatus(adminMessage, `${enquiries.length} enquiry record(s) loaded.`, 'success');
    renderTable();
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const button = loginForm.querySelector('button');
    button.disabled = true;
    setStatus(loginForm.querySelector('.form-status'), 'Signing in...', '');

    try {
      await window.MJEnquiries.signIn(formData.get('email'), formData.get('password'));
      showDashboard(true);
      await loadEnquiries();
      loginForm.reset();
    } catch (error) {
      setStatus(loginForm.querySelector('.form-status'), error.message || 'Sign in failed.', 'error');
    } finally {
      button.disabled = false;
    }
  });

  refreshButton.addEventListener('click', () => loadEnquiries().catch((error) => {
    setStatus(adminMessage, error.message || 'Unable to refresh enquiries.', 'error');
  }));

  signoutButton.addEventListener('click', async () => {
    await window.MJEnquiries.signOut();
    enquiries = [];
    renderTable();
    showDashboard(false);
  });

  searchInput.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);

  window.addEventListener('DOMContentLoaded', async () => {
    try {
      const session = await window.MJEnquiries.getSession();
      if (session) {
        showDashboard(true);
        await loadEnquiries();
      }
    } catch (error) {
      showDashboard(false);
      setStatus(loginForm.querySelector('.form-status'), error.message, 'error');
    }
  });
})();
