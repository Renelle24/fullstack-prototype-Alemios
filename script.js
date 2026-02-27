const STORAGE_KEY = 'ipt_demo_v1';
let currentUser = null;

/* ── Storage ── */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      window.db = JSON.parse(raw);
      return;
    }
  } catch (e) { /* corrupt */ }

  // Seed defaults
  window.db = {
    accounts: [
      {
        id: 'acc-admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'Password123!',
        role: 'admin',
        verified: true
      }
    ],
    departments: [
      { id: 'dept-1', name: 'Engineering', description: 'Software & hardware engineering team' },
      { id: 'dept-2', name: 'HR', description: 'Human resources & people ops' }
    ],
    employees: [],
    requests: []
  };
  saveToStorage();
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

/* ── Toast ── */
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast-msg ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ── Auth state ── */
function setAuthState(isAuth, user = null) {
  currentUser = user;
  const body = document.body;
  if (isAuth && user) {
    body.classList.remove('not-authenticated');
    body.classList.add('authenticated');
    if (user.role === 'admin') body.classList.add('is-admin');
    else body.classList.remove('is-admin');
    document.getElementById('nav-username').textContent = `${user.firstName} ${user.lastName}`;
  } else {
    body.classList.remove('authenticated', 'is-admin');
    body.classList.add('not-authenticated');
  }
}

/* ── Routing ── */
const protectedRoutes = ['#/profile', '#/requests'];
const adminRoutes = ['#/employees', '#/accounts', '#/departments'];

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  const hash = window.location.hash || '#/';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  if (protectedRoutes.includes(hash) && !currentUser) {
    showToast('Please log in to access that page.', 'warning');
    navigateTo('#/login');
    return;
  }
  if (adminRoutes.includes(hash) && (!currentUser || currentUser.role !== 'admin')) {
    showToast('Admin access required.', 'error');
    navigateTo('#/');
    return;
  }

  const map = {
    '#/': 'home-page',
    '#/register': 'register-page',
    '#/verify-email': 'verify-email-page',
    '#/login': 'login-page',
    '#/profile': 'profile-page',
    '#/employees': 'employees-page',
    '#/departments': 'departments-page',
    '#/accounts': 'accounts-page',
    '#/requests': 'requests-page'
  };

  const pageId = map[hash] || 'home-page';
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');

  if (hash === '#/profile')     renderProfile();
  if (hash === '#/employees')   renderEmployeesTable();
  if (hash === '#/accounts')    renderAccountsList();
  if (hash === '#/departments') renderDepartmentsList();
  if (hash === '#/requests')    renderRequestsList();
  if (hash === '#/verify-email') renderVerifyPage();
}

window.addEventListener('hashchange', handleRouting);

/* ── Registration ── */
document.getElementById('register-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const firstName = document.getElementById('reg-first').value.trim();
  const lastName  = document.getElementById('reg-last').value.trim();
  const email     = document.getElementById('reg-email').value.trim().toLowerCase();
  const password  = document.getElementById('reg-password').value;

  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }
  const exists = window.db.accounts.find(a => a.email === email);
  if (exists) {
    showToast('An account with that email already exists.', 'error');
    return;
  }

  const account = {
    id: 'acc-' + Date.now(),
    firstName, lastName, email, password,
    role: 'user',
    verified: false
  };
  window.db.accounts.push(account);
  saveToStorage();
  localStorage.setItem('unverified_email', email);
  showToast('Account created! Please verify your email.', 'success');
  this.reset();
  navigateTo('#/verify-email');
});

/* ── Verify email ── */
function renderVerifyPage() {
  const email = localStorage.getItem('unverified_email') || '';
  document.getElementById('verify-email-display').textContent = email || 'your email';
}

document.getElementById('btn-simulate-verify').addEventListener('click', function () {
  const email = localStorage.getItem('unverified_email');
  if (!email) { showToast('No pending verification.', 'warning'); return; }
  const account = window.db.accounts.find(a => a.email === email);
  if (!account) { showToast('Account not found.', 'error'); return; }
  account.verified = true;
  saveToStorage();
  localStorage.removeItem('unverified_email');
  showToast('Email verified! You can now log in.', 'success');
  navigateTo('#/login');
});

/* ── Login ── */
document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');

  const user = window.db.accounts.find(
    a => a.email === email && a.password === password && a.verified
  );

  if (!user) {
    errEl.classList.remove('d-none');
    return;
  }

  errEl.classList.add('d-none');
  localStorage.setItem('auth_token', email);
  setAuthState(true, user);
  showToast(`Welcome back, ${user.firstName}!`, 'success');
  this.reset();
  navigateTo('#/profile');
});

/* ── Logout ── */
document.getElementById('nav-logout').addEventListener('click', function (e) {
  e.preventDefault();
  localStorage.removeItem('auth_token');
  setAuthState(false);
  showToast('Logged out.', 'info');
  navigateTo('#/');
});

/* ──────────────────────────────────────────
   PROFILE — render + edit
   ────────────────────────────────────────── */
function renderProfile() {
  if (!currentUser) return;
  const u = currentUser;
  document.getElementById('profile-avatar-initials').textContent = u.firstName[0] + u.lastName[0];
  document.getElementById('profile-name').textContent  = `${u.firstName} ${u.lastName}`;
  document.getElementById('profile-email').textContent = u.email;
  document.getElementById('profile-role').textContent  = u.role === 'admin' ? 'Administrator' : 'User';

  const empRec = window.db.employees.find(e => e.email === u.email);
  document.getElementById('profile-position').textContent = empRec ? empRec.position : '—';

  if (empRec) {
    const dept = window.db.departments.find(d => d.id === empRec.deptId);
    document.getElementById('profile-dept').textContent = dept ? dept.name : '—';
  } else {
    document.getElementById('profile-dept').textContent = '—';
  }
}

/* Open Edit Profile modal — pre-fill all fields */
document.getElementById('btn-edit-profile').addEventListener('click', function () {
  if (!currentUser) return;

  // Fill basic fields
  document.getElementById('edit-first').value    = currentUser.firstName;
  document.getElementById('edit-last').value     = currentUser.lastName;
  document.getElementById('edit-email').value    = currentUser.email;
  document.getElementById('edit-password').value = '';   // always blank for security

  // Populate department dropdown from window.db.departments
  const deptSel = document.getElementById('edit-dept');
  deptSel.innerHTML = '<option value="">— None / Not assigned —</option>';
  window.db.departments.forEach(d => {
    const opt = document.createElement('option');
    opt.value       = d.id;
    opt.textContent = d.name;
    deptSel.appendChild(opt);
  });

  // Pre-select current employee's department if one exists
  const empRec = window.db.employees.find(e => e.email === currentUser.email);
  deptSel.value = empRec ? empRec.deptId : '';

  new bootstrap.Modal(document.getElementById('editProfileModal')).show();
});

/* Save Edit Profile */
document.getElementById('edit-profile-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const firstName  = document.getElementById('edit-first').value.trim();
  const lastName   = document.getElementById('edit-last').value.trim();
  const email      = document.getElementById('edit-email').value.trim().toLowerCase();
  const password   = document.getElementById('edit-password').value;
  const newDeptId  = document.getElementById('edit-dept').value;

  // Validate
  if (!firstName || !lastName) { showToast('First and last name are required.', 'error'); return; }
  if (!email)                  { showToast('Email is required.', 'error'); return; }

  // Check email not taken by a DIFFERENT account
  const conflict = window.db.accounts.find(a => a.email === email && a.id !== currentUser.id);
  if (conflict) { showToast('That email is already used by another account.', 'error'); return; }

  if (password && password.length < 6) {
    showToast('New password must be at least 6 characters.', 'error');
    return;
  }

  // 1. Update the account record in db
  const acc = window.db.accounts.find(a => a.id === currentUser.id);
  acc.firstName = firstName;
  acc.lastName  = lastName;
  acc.email     = email;
  if (password) acc.password = password;

  // 2. Update department via the employee record (if one is linked to this email)
  //    We match on the OLD email in case the user just changed it
  const empRec = window.db.employees.find(
    e => e.email === currentUser.email || e.email === email
  );
  if (empRec) {
    empRec.email  = email;       // keep employee record in sync with new email
    empRec.deptId = newDeptId;   // apply the selected department
  }

  // 3. If email changed, update auth_token so the session stays valid
  if (email !== currentUser.email) {
    localStorage.setItem('auth_token', email);
  }

  saveToStorage();
  setAuthState(true, acc);   // refreshes currentUser + navbar username
  renderProfile();           // refreshes profile page display

  bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
  showToast('Profile updated successfully!', 'success');
});

/* ──────────────────────────────────────────
   ACCOUNTS (admin)
   ────────────────────────────────────────── */
function renderAccountsList() {
  const tbody = document.getElementById('accounts-tbody');
  tbody.innerHTML = '';
  window.db.accounts.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.firstName} ${a.lastName}</td>
      <td>${a.email}</td>
      <td><span class="badge ${a.role === 'admin' ? 'bg-warning text-dark' : 'bg-secondary'}">${a.role}</span></td>
      <td>${a.verified ? '✅' : '—'}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="openEditAccount('${a.id}')">Edit</button>
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="resetPassword('${a.id}')">Reset PW</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAccount('${a.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

let editingAccountId = null;

document.getElementById('btn-add-account').addEventListener('click', function () {
  editingAccountId = null;
  document.getElementById('account-form').reset();
  document.getElementById('account-modal-title').textContent = 'Add Account';
  document.getElementById('acc-password-group').style.display = '';
  new bootstrap.Modal(document.getElementById('accountModal')).show();
});

window.openEditAccount = function (id) {
  const acc = window.db.accounts.find(a => a.id === id);
  if (!acc) return;
  editingAccountId = id;
  document.getElementById('acc-first').value       = acc.firstName;
  document.getElementById('acc-last').value        = acc.lastName;
  document.getElementById('acc-email').value       = acc.email;
  document.getElementById('acc-role').value        = acc.role;
  document.getElementById('acc-verified').checked  = acc.verified;
  document.getElementById('acc-password-group').style.display = 'none';
  document.getElementById('account-modal-title').textContent  = 'Edit Account';
  new bootstrap.Modal(document.getElementById('accountModal')).show();
};

document.getElementById('account-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const firstName = document.getElementById('acc-first').value.trim();
  const lastName  = document.getElementById('acc-last').value.trim();
  const email     = document.getElementById('acc-email').value.trim().toLowerCase();
  const role      = document.getElementById('acc-role').value;
  const verified  = document.getElementById('acc-verified').checked;

  if (editingAccountId) {
    const acc = window.db.accounts.find(a => a.id === editingAccountId);
    Object.assign(acc, { firstName, lastName, email, role, verified });
    showToast('Account updated.', 'success');
  } else {
    const password = document.getElementById('acc-password').value;
    if (password.length < 6) { showToast('Password too short.', 'error'); return; }
    const exists = window.db.accounts.find(a => a.email === email);
    if (exists) { showToast('Email already in use.', 'error'); return; }
    window.db.accounts.push({
      id: 'acc-' + Date.now(), firstName, lastName, email, password, role, verified
    });
    showToast('Account created.', 'success');
  }

  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('accountModal')).hide();
  renderAccountsList();
});

window.resetPassword = function (id) {
  const pw = prompt('Enter new password (min 6 chars):');
  if (!pw || pw.length < 6) { showToast('Password too short or cancelled.', 'error'); return; }
  const acc = window.db.accounts.find(a => a.id === id);
  acc.password = pw;
  saveToStorage();
  showToast('Password reset.', 'success');
};

window.deleteAccount = function (id) {
  if (currentUser && currentUser.id === id) { showToast('Cannot delete yourself.', 'error'); return; }
  if (!confirm('Delete this account?')) return;
  window.db.accounts = window.db.accounts.filter(a => a.id !== id);
  saveToStorage();
  renderAccountsList();
  showToast('Account deleted.', 'info');
};

/* ──────────────────────────────────────────
   DEPARTMENTS (admin)
   ────────────────────────────────────────── */
function renderDepartmentsList() {
  const tbody = document.getElementById('departments-tbody');
  tbody.innerHTML = '';
  window.db.departments.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.name}</td>
      <td>${d.description}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editDept('${d.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteDept('${d.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

let editingDeptId = null;

document.getElementById('btn-add-dept').addEventListener('click', function () {
  editingDeptId = null;
  document.getElementById('dept-form').reset();
  document.getElementById('dept-modal-title').textContent = 'Add Department';
  new bootstrap.Modal(document.getElementById('deptModal')).show();
});

window.editDept = function (id) {
  const d = window.db.departments.find(x => x.id === id);
  if (!d) return;
  editingDeptId = id;
  document.getElementById('dept-name').value = d.name;
  document.getElementById('dept-desc').value = d.description;
  document.getElementById('dept-modal-title').textContent = 'Edit Department';
  new bootstrap.Modal(document.getElementById('deptModal')).show();
};

/* The submit button lives INSIDE the <form> tag in the HTML,
   so this event reliably fires every time.                    */
document.getElementById('dept-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const name        = document.getElementById('dept-name').value.trim();
  const description = document.getElementById('dept-desc').value.trim();

  if (!name) { showToast('Department name is required.', 'error'); return; }

  if (editingDeptId) {
    const d = window.db.departments.find(x => x.id === editingDeptId);
    Object.assign(d, { name, description });
    showToast('Department updated.', 'success');
  } else {
    window.db.departments.push({ id: 'dept-' + Date.now(), name, description });
    showToast('Department added.', 'success');
  }

  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('deptModal')).hide();
  renderDepartmentsList();
});

window.deleteDept = function (id) {
  if (!confirm('Delete this department?')) return;
  window.db.departments = window.db.departments.filter(d => d.id !== id);
  saveToStorage();
  renderDepartmentsList();
  showToast('Department deleted.', 'info');
};

/* ──────────────────────────────────────────
   EMPLOYEES (admin)
   ────────────────────────────────────────── */
function renderEmployeesTable() {
  const tbody = document.getElementById('employees-tbody');
  tbody.innerHTML = '';
  window.db.employees.forEach(emp => {
    const dept = window.db.departments.find(d => d.id === emp.deptId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${emp.employeeId}</td>
      <td>${emp.email}</td>
      <td>${emp.position}</td>
      <td>${dept ? dept.name : '—'}</td>
      <td>${emp.hireDate}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="openEditEmployee('${emp.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

let editingEmployeeId = null;

/* Helper: rebuild any <select> element with all current departments */
function populateDeptDropdown(selectId, selectedDeptId = '') {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">Select department</option>';
  window.db.departments.forEach(d => {
    const opt = document.createElement('option');
    opt.value       = d.id;
    opt.textContent = d.name;
    if (d.id === selectedDeptId) opt.selected = true;
    sel.appendChild(opt);
  });
}

document.getElementById('btn-add-employee').addEventListener('click', function () {
  editingEmployeeId = null;
  document.getElementById('employee-form').reset();
  document.getElementById('emp-modal-title').textContent = 'Add Employee';
  populateDeptDropdown('emp-dept');
  new bootstrap.Modal(document.getElementById('employeeModal')).show();
});

window.openEditEmployee = function (id) {
  const emp = window.db.employees.find(e => e.id === id);
  if (!emp) return;
  editingEmployeeId = id;
  populateDeptDropdown('emp-dept', emp.deptId);   // pass current deptId so it's pre-selected
  document.getElementById('emp-id').value       = emp.employeeId;
  document.getElementById('emp-email').value    = emp.email;
  document.getElementById('emp-position').value = emp.position;
  document.getElementById('emp-hire').value     = emp.hireDate;
  document.getElementById('emp-modal-title').textContent = 'Edit Employee';
  new bootstrap.Modal(document.getElementById('employeeModal')).show();
};

document.getElementById('employee-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const employeeId = document.getElementById('emp-id').value.trim();
  const email      = document.getElementById('emp-email').value.trim().toLowerCase();
  const position   = document.getElementById('emp-position').value.trim();
  const deptId     = document.getElementById('emp-dept').value;
  const hireDate   = document.getElementById('emp-hire').value;

  if (!window.db.accounts.find(a => a.email === email)) {
    showToast('No account found with that email.', 'error');
    return;
  }
  if (!deptId) {
    showToast('Please select a department.', 'error');
    return;
  }

  if (editingEmployeeId) {
    const emp = window.db.employees.find(e => e.id === editingEmployeeId);
    Object.assign(emp, { employeeId, email, position, deptId, hireDate });
    showToast('Employee updated.', 'success');
  } else {
    window.db.employees.push({
      id: 'emp-' + Date.now(), employeeId, email, position, deptId, hireDate
    });
    showToast('Employee added.', 'success');
  }

  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
  renderEmployeesTable();
});

window.deleteEmployee = function (id) {
  if (!confirm('Delete this employee record?')) return;
  window.db.employees = window.db.employees.filter(e => e.id !== id);
  saveToStorage();
  renderEmployeesTable();
  showToast('Employee deleted.', 'info');
};

/* ──────────────────────────────────────────
   REQUESTS
   ────────────────────────────────────────── */
let requestItems = [];

function renderRequestsList() {
  if (!currentUser) return;
  const tbody  = document.getElementById('requests-tbody');
  tbody.innerHTML = '';

  // Admin sees ALL requests; regular user sees only their own
  const list = currentUser.role === 'admin'
    ? window.db.requests
    : window.db.requests.filter(r => r.employeeEmail === currentUser.email);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--text-muted);padding:2rem">No requests yet.</td></tr>`;
    return;
  }

  const badgeMap = { Pending: 'bg-warning text-dark', Approved: 'bg-success', Rejected: 'bg-danger' };
  list.forEach(r => {
    const badge = badgeMap[r.status] || 'bg-secondary';
    const items = r.items.map(i => `${i.name} (×${i.qty})`).join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.type}</td>
      <td style="max-width:200px;word-break:break-word">${items}</td>
      <td><span class="badge ${badge}">${r.status}</span></td>
      <td>
        ${currentUser.role === 'admin' ? `
          <button class="btn btn-sm btn-success me-1" onclick="updateRequestStatus('${r.id}','Approved')">Approve</button>
          <button class="btn btn-sm btn-danger"       onclick="updateRequestStatus('${r.id}','Rejected')">Reject</button>
        ` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.updateRequestStatus = function (id, status) {
  const req = window.db.requests.find(r => r.id === id);
  if (req) {
    req.status = status;
    saveToStorage();
    renderRequestsList();
    showToast(`Request ${status.toLowerCase()}.`, 'success');
  }
};

function buildItemRows() {
  const container = document.getElementById('items-container');
  container.innerHTML = '';
  requestItems.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'item-row mb-2';
    row.innerHTML = `
      <input class="form-control" placeholder="Item name" value="${item.name}"
             oninput="requestItems[${i}].name=this.value" />
      <input class="form-control" type="number" min="1" placeholder="Qty" value="${item.qty}"
             style="max-width:90px" oninput="requestItems[${i}].qty=+this.value" />
      <button type="button" class="btn btn-sm btn-outline-secondary" onclick="removeItem(${i})">×</button>
    `;
    container.appendChild(row);
  });
}

document.getElementById('btn-add-item').addEventListener('click', function () {
  requestItems.push({ name: '', qty: 1 });
  buildItemRows();
});

window.removeItem = function (i) {
  requestItems.splice(i, 1);
  buildItemRows();
};

document.getElementById('btn-new-request').addEventListener('click', function () {
  requestItems = [{ name: '', qty: 1 }];
  document.getElementById('req-type').value = 'Equipment';
  buildItemRows();
  new bootstrap.Modal(document.getElementById('requestModal')).show();
});

document.getElementById('request-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const type       = document.getElementById('req-type').value;
  const validItems = requestItems.filter(i => i.name.trim() && i.qty > 0);
  if (!validItems.length) { showToast('Add at least one item.', 'error'); return; }

  window.db.requests.push({
    id: 'req-' + Date.now(),
    type,
    items: validItems,
    status: 'Pending',
    date: new Date().toLocaleDateString(),
    employeeEmail: currentUser.email
  });
  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
  renderRequestsList();
  showToast('Request submitted!', 'success');
});

/* ──────────────────────────────────────────
   INIT
   ────────────────────────────────────────── */
function init() {
  loadFromStorage();

  const token = localStorage.getItem('auth_token');
  if (token) {
    const user = window.db.accounts.find(a => a.email === token && a.verified);
    if (user) setAuthState(true, user);
    else localStorage.removeItem('auth_token');
  }

  if (!window.location.hash) window.location.hash = '#/';
  handleRouting();
}

document.addEventListener('DOMContentLoaded', init);