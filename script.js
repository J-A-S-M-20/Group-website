/* ============================================================
   ContactHub — script.js
   ITEL 203 Group Performance Task
   Uses: getElementById, querySelector, addEventListener,
         createElement, appendChild, remove(), DOM manipulation,
         form validation, event handling
   ============================================================ */

// ── State ────────────────────────────────────────────────────
let contacts = [];
let nextId   = 1;
let editId   = null;   // null = adding new, number = editing
let deleteTarget = null;

// ── Element references ───────────────────────────────────────
const inputName     = document.getElementById("inputName");
const inputPhone    = document.getElementById("inputPhone");
const inputEmail    = document.getElementById("inputEmail");
const errName       = document.getElementById("errName");
const errPhone      = document.getElementById("errPhone");
const errEmail      = document.getElementById("errEmail");
const btnSubmit     = document.getElementById("btnSubmit");
const btnClear      = document.getElementById("btnClear");
const btnCancelEdit = document.getElementById("btnCancelEdit");
const formTitle     = document.getElementById("form-title");
const searchInput   = document.getElementById("searchInput");
const contactBody   = document.getElementById("contactBody");
const statBadge     = document.getElementById("statBadge");
const emptyState    = document.getElementById("emptyState");
const deleteModal   = document.getElementById("deleteModal");
const deleteModalText = document.getElementById("deleteModalText");
const btnCancelDelete = document.getElementById("btnCancelDelete");
const btnConfirmDelete = document.getElementById("btnConfirmDelete");
const toast         = document.getElementById("toast");

// ── Avatar colors ────────────────────────────────────────────
const AV_COLORS = [
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#dcfce7", fg: "#15803d" },
  { bg: "#fce7f3", fg: "#9d174d" },
  { bg: "#fef3c7", fg: "#92400e" },
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#ffedd5", fg: "#9a3412" },
  { bg: "#e0f2fe", fg: "#0369a1" },
  { bg: "#f0fdf4", fg: "#166534" },
];
function getColor(name) {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AV_COLORS.length;
  return AV_COLORS[idx];
}
function getInitials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Validation ───────────────────────────────────────────────
function validate() {
  let valid = true;

  // Name
  if (inputName.value.trim() === "") {
    errName.textContent = "Name is required.";
    inputName.classList.add("error");
    valid = false;
  } else if (inputName.value.trim().length < 2) {
    errName.textContent = "Name must be at least 2 characters.";
    inputName.classList.add("error");
    valid = false;
  } else {
    errName.textContent = "";
    inputName.classList.remove("error");
  }

  // Phone
  const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
  if (inputPhone.value.trim() === "") {
    errPhone.textContent = "Phone number is required.";
    inputPhone.classList.add("error");
    valid = false;
  } else if (!phoneRegex.test(inputPhone.value.trim())) {
    errPhone.textContent = "Enter a valid phone number (7–15 digits).";
    inputPhone.classList.add("error");
    valid = false;
  } else {
    errPhone.textContent = "";
    inputPhone.classList.remove("error");
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (inputEmail.value.trim() === "") {
    errEmail.textContent = "Email address is required.";
    inputEmail.classList.add("error");
    valid = false;
  } else if (!emailRegex.test(inputEmail.value.trim())) {
    errEmail.textContent = "Enter a valid email address.";
    inputEmail.classList.add("error");
    valid = false;
  } else {
    errEmail.textContent = "";
    inputEmail.classList.remove("error");
  }

  return valid;
}

// ── Clear form ───────────────────────────────────────────────
function clearForm() {
  inputName.value  = "";
  inputPhone.value = "";
  inputEmail.value = "";
  errName.textContent  = "";
  errPhone.textContent = "";
  errEmail.textContent = "";
  inputName.classList.remove("error");
  inputPhone.classList.remove("error");
  inputEmail.classList.remove("error");
}

// ── Reset to Add mode ────────────────────────────────────────
function resetToAddMode() {
  editId = null;
  clearForm();
  formTitle.textContent    = "Add New Contact";
  btnSubmit.innerHTML      = "&#10010; Add Contact";
  btnSubmit.className      = "btn btn-primary";
  btnCancelEdit.style.display = "none";
}

// ── Render table ─────────────────────────────────────────────
function renderTable(list) {
  contactBody.innerHTML = "";

  if (list.length === 0) {
    emptyState.style.display = "block";
    document.getElementById("contactTable").style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  document.getElementById("contactTable").style.display = "table";

  list.forEach((c, index) => {
    const col = getColor(c.name);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="td-id">${String(c.id).padStart(3, "0")}</td>
      <td>
        <div class="av-cell">
          <div class="av-sm" style="background:${col.bg};color:${col.fg};">
            ${getInitials(c.name)}
          </div>
          <span class="td-name">${escapeHTML(c.name)}</span>
        </div>
      </td>
      <td>${escapeHTML(c.phone)}</td>
      <td class="td-email">${escapeHTML(c.email)}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-warning btn-sm" data-edit="${c.id}">&#9998; Edit</button>
          <button class="btn btn-danger  btn-sm" data-del="${c.id}">&#128465; Delete</button>
        </div>
      </td>
    `;

    // Edit button listener
    row.querySelector("[data-edit]").addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-edit"));
      startEdit(id);
    });

    // Delete button listener
    row.querySelector("[data-del]").addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-del"));
      openDeleteModal(id);
    });

    contactBody.appendChild(row);
  });
}

// ── Update stat badge ────────────────────────────────────────
function updateStats() {
  const n = contacts.length;
  statBadge.textContent = n + (n === 1 ? " contact" : " contacts");
}

// ── Filter + render ──────────────────────────────────────────
function filterAndRender() {
  const q = searchInput.value.toLowerCase();
  const filtered = q
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(q)  ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      )
    : contacts;
  renderTable(filtered);
  // show real count always
  updateStats();
}

// ── Add contact ──────────────────────────────────────────────
function addContact() {
  if (!validate()) return;

  const contact = {
    id:    nextId++,
    name:  inputName.value.trim(),
    phone: inputPhone.value.trim(),
    email: inputEmail.value.trim(),
  };

  contacts.push(contact);
  clearForm();
  filterAndRender();
  showToast("Contact added successfully!", "success");
}

// ── Start edit ───────────────────────────────────────────────
function startEdit(id) {
  const c = contacts.find(x => x.id === id);
  if (!c) return;

  editId = id;
  inputName.value  = c.name;
  inputPhone.value = c.phone;
  inputEmail.value = c.email;

  formTitle.textContent       = "Edit Contact";
  btnSubmit.innerHTML         = "&#10003; Save Changes";
  btnSubmit.className         = "btn btn-primary";
  btnCancelEdit.style.display = "inline-flex";

  // scroll to form
  inputName.scrollIntoView({ behavior: "smooth", block: "center" });
  inputName.focus();
}

// ── Save edit ────────────────────────────────────────────────
function saveEdit() {
  if (!validate()) return;

  const idx = contacts.findIndex(x => x.id === editId);
  if (idx === -1) return;

  contacts[idx].name  = inputName.value.trim();
  contacts[idx].phone = inputPhone.value.trim();
  contacts[idx].email = inputEmail.value.trim();

  resetToAddMode();
  filterAndRender();
  showToast("Contact updated successfully!", "success");
}

// ── Delete modal ─────────────────────────────────────────────
function openDeleteModal(id) {
  deleteTarget = id;
  const c = contacts.find(x => x.id === id);
  deleteModalText.textContent = `"${c ? c.name : "This contact"}" will be permanently removed.`;
  deleteModal.classList.add("open");
}

function closeDeleteModal() {
  deleteTarget = null;
  deleteModal.classList.remove("open");
}

function confirmDelete() {
  if (deleteTarget === null) return;
  contacts = contacts.filter(x => x.id !== deleteTarget);
  closeDeleteModal();
  filterAndRender();
  showToast("Contact deleted.", "danger");
  // if we were editing the deleted contact, reset form
  if (editId === deleteTarget) resetToAddMode();
}

// ── Toast ────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = "") {
  toast.textContent = msg;
  toast.className   = "show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = ""; }, 2500);
}

// ── XSS guard ────────────────────────────────────────────────
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Event listeners ──────────────────────────────────────────
btnSubmit.addEventListener("click", function () {
  if (editId !== null) { saveEdit(); } else { addContact(); }
});

btnClear.addEventListener("click", function () {
  resetToAddMode();
});

btnCancelEdit.addEventListener("click", function () {
  resetToAddMode();
});

searchInput.addEventListener("input", function () {
  filterAndRender();
});

btnCancelDelete.addEventListener("click",  closeDeleteModal);
btnConfirmDelete.addEventListener("click", confirmDelete);

// close modal on overlay click
deleteModal.addEventListener("click", function (e) {
  if (e.target === deleteModal) closeDeleteModal();
});

// clear validation on typing
inputName.addEventListener("input",  function () { errName.textContent  = ""; inputName.classList.remove("error");  });
inputPhone.addEventListener("input", function () { errPhone.textContent = ""; inputPhone.classList.remove("error"); });
inputEmail.addEventListener("input", function () { errEmail.textContent = ""; inputEmail.classList.remove("error"); });

// ── Seed sample data ─────────────────────────────────────────
(function seedData() {
  const samples = [
    { name: "Maria Santos",   phone: "09171234567", email: "maria@gmail.com" },
    { name: "Juan Dela Cruz", phone: "09281234567", email: "juan@yahoo.com"  },
    { name: "Ana Reyes",      phone: "09351234567", email: "ana@outlook.com" },
  ];
  samples.forEach(s => {
    contacts.push({ id: nextId++, ...s });
  });
  filterAndRender();
})();
