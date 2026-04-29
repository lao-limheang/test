// js/scanner.js
import {
  collection, addDoc, getDocs, serverTimestamp, query, orderBy, limit, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

// ─── Telegram Config ───────────────────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";   // ← replace
const TELEGRAM_CHAT_ID   = "YOUR_CHAT_ID_HERE";     // ← replace

async function sendToTelegram(name, time, status) {
  const emoji = status === "Check-In" ? "✅" : "🚪";
  const text = `${emoji} *HR Attendance Alert*\n\n👤 *Name:* ${name}\n🕐 *Time:* ${time}\n📌 *Status:* ${status}`;
  const url  = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" })
    });
  } catch (err) {
    console.warn("Telegram alert failed:", err.message);
  }
}

// ─── Determine Check-In / Check-Out ───────────────────────────────────────────
async function getNextStatus(staffId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, "attendance"),
    where("staffId", "==", staffId),
    where("timestamp", ">=", today),
    orderBy("timestamp", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return "Check-In";
  const last = snap.docs[0].data().status;
  return last === "Check-In" ? "Check-Out" : "Check-In";
}

// ─── Save Attendance ───────────────────────────────────────────────────────────
async function saveAttendance(staffId, staffName, status) {
  await addDoc(collection(db, "attendance"), {
    staffId,
    staffName,
    status,
    timestamp: serverTimestamp()
  });
}

// ─── Render Recent Logs ────────────────────────────────────────────────────────
export async function renderAttendanceLogs() {
  const tbody = document.getElementById("attendanceTableBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-white/40">Loading…</td></tr>`;

  try {
    const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"), limit(20));
    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-white/40">No attendance records yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = snap.docs.map(d => {
      const data = d.data();
      const ts   = data.timestamp?.toDate();
      const dateStr = ts ? ts.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—";
      const timeStr = ts ? ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
      const isIn  = data.status === "Check-In";
      return `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td class="px-5 py-3 text-white font-medium">${escHtml(data.staffName || "Unknown")}</td>
          <td class="px-5 py-3 text-white/60 text-sm">${dateStr}</td>
          <td class="px-5 py-3 text-white/60 text-sm">${timeStr}</td>
          <td class="px-5 py-3">
            <span class="px-3 py-1 rounded-full text-xs font-bold ${isIn
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-orange-500/20 text-orange-400 border border-orange-500/30"}">
              ${data.status}
            </span>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-red-400">Error: ${err.message}</td></tr>`;
  }
}

// ─── Init QR Scanner ──────────────────────────────────────────────────────────
export function initScanner() {
  const readerEl   = document.getElementById("reader");
  const resultEl   = document.getElementById("scanResult");
  const startBtn   = document.getElementById("startScanBtn");
  const stopBtn    = document.getElementById("stopScanBtn");
  if (!readerEl) return;

  let scanner = null;
  let lastScanned = "";
  let cooldown = false;

  function setResult(msg, type = "info") {
    if (!resultEl) return;
    const colors = { success: "text-[#D4AF37]", error: "text-red-400", info: "text-white/60" };
    resultEl.className = `text-center text-sm mt-3 font-medium ${colors[type] || colors.info}`;
    resultEl.textContent = msg;
  }

  async function onScanSuccess(decodedText) {
    if (cooldown || decodedText === lastScanned) return;
    cooldown = true;
    lastScanned = decodedText;

    // beep
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}

    setResult("Processing…", "info");

    try {
      // Expected QR format: "STAFF_ID::Staff Name"
      let staffId, staffName;
      if (decodedText.includes("::")) {
        [staffId, staffName] = decodedText.split("::");
      } else {
        staffId   = decodedText;
        staffName = decodedText;
      }

      const status  = await getNextStatus(staffId.trim());
      const now     = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      await saveAttendance(staffId.trim(), staffName.trim(), status);
      await sendToTelegram(staffName.trim(), timeStr, status);
      await renderAttendanceLogs();

      const emoji = status === "Check-In" ? "✅" : "🚪";
      setResult(`${emoji} ${staffName.trim()} — ${status} at ${timeStr}`, "success");
    } catch (err) {
      setResult(`Error: ${err.message}`, "error");
    }

    setTimeout(() => { cooldown = false; }, 4000);
  }

  function onScanFailure() { /* silent */ }

  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      if (scanner) return;
      scanner = new Html5Qrcode("reader");
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          onScanFailure
        );
        startBtn.classList.add("hidden");
        stopBtn.classList.remove("hidden");
        setResult("Scanner active — point camera at a QR code.", "info");
      } catch (err) {
        setResult(`Camera error: ${err.message}`, "error");
        scanner = null;
      }
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", async () => {
      if (scanner) {
        await scanner.stop();
        scanner = null;
      }
      stopBtn.classList.add("hidden");
      startBtn.classList.remove("hidden");
      readerEl.innerHTML = "";
      setResult("Scanner stopped.", "info");
    });
  }
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}