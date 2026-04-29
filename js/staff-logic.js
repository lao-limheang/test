// js/staff-logic.js
import {
  collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

const COLLECTION = "staffs";

// ─── Add Staff ─────────────────────────────────────────────────────────────────
export async function addStaff(name, role, baseSalary) {
  if (!name || !role || !baseSalary) throw new Error("All fields are required.");
  await addDoc(collection(db, COLLECTION), {
    name,
    role,
    baseSalary: parseFloat(baseSalary),
    createdAt: serverTimestamp()
  });
}

// ─── Read All Staff ────────────────────────────────────────────────────────────
export async function getAllStaff() {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── Delete Staff ──────────────────────────────────────────────────────────────
export async function deleteStaff(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── Render Table ──────────────────────────────────────────────────────────────
export async function renderStaffTable() {
  const tbody = document.getElementById("staffTableBody");
  const emptyState = document.getElementById("emptyState");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-white/40">
    <div class="flex items-center justify-center gap-2">
      <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg> Loading…
    </div>
  </td></tr>`;

  try {
    const staffList = await getAllStaff();

    if (staffList.length === 0) {
      tbody.innerHTML = "";
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }

    if (emptyState) emptyState.classList.add("hidden");

    tbody.innerHTML = staffList.map((s, i) => `
      <tr class="border-b border-white/5 hover:bg-white/5 transition-colors group">
        <td class="px-6 py-4 text-white/50 text-sm font-mono">${String(i + 1).padStart(2, "0")}</td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                 style="background: linear-gradient(135deg,#D4AF37,#a07c1e); color:#121212;">
              ${s.name.charAt(0).toUpperCase()}
            </div>
            <span class="text-white font-medium">${escHtml(s.name)}</span>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/10">
            ${escHtml(s.role)}
          </span>
        </td>
        <td class="px-6 py-4 text-[#D4AF37] font-semibold">$${s.baseSalary.toLocaleString("en-US", {minimumFractionDigits:2})}</td>
        <td class="px-6 py-4">
          <button onclick="confirmDelete('${s.id}','${escHtml(s.name)}')"
            class="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-lg text-xs font-semibold
                   bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 cursor-pointer">
            Delete
          </button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-400">Error: ${err.message}</td></tr>`;
  }
}

// ─── Handle Add Form ───────────────────────────────────────────────────────────
export function handleAddStaffForm() {
  const form = document.getElementById("addStaffForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("staffName").value.trim();
    const role = document.getElementById("staffRole").value.trim();
    const salary = document.getElementById("staffSalary").value;
    const btn = document.getElementById("addStaffBtn");
    const btnLabel = document.getElementById("addBtnLabel");

    if (btnLabel) btnLabel.textContent = "Saving…";
    if (btn) btn.disabled = true;

    try {
      await addStaff(name, role, salary);
      form.reset();
      showToast("Staff member added successfully!", "success");
      await renderStaffTable();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      if (btnLabel) btnLabel.textContent = "Add Staff";
      if (btn) btn.disabled = false;
    }
  });
}

// ─── Confirm & Delete ──────────────────────────────────────────────────────────
window.confirmDelete = async function(id, name) {
  const modal = document.getElementById("deleteModal");
  const nameEl = document.getElementById("deleteModalName");
  if (modal) {
    if (nameEl) nameEl.textContent = name;
    modal.classList.remove("hidden");
    modal.dataset.pendingId = id;
  }
};

window.closeDeleteModal = function() {
  const modal = document.getElementById("deleteModal");
  if (modal) modal.classList.add("hidden");
};

window.confirmDeleteAction = async function() {
  const modal = document.getElementById("deleteModal");
  const id = modal?.dataset.pendingId;
  if (!id) return;
  try {
    await deleteStaff(id);
    modal.classList.add("hidden");
    showToast("Staff member removed.", "success");
    await renderStaffTable();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// ─── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl z-50 transition-all duration-300
    ${type === "success" ? "bg-[#D4AF37] text-[#121212]" : "bg-red-500 text-white"}`;
  toast.classList.remove("opacity-0", "translate-y-4");
  setTimeout(() => { toast.classList.add("opacity-0", "translate-y-4"); }, 3000);
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}