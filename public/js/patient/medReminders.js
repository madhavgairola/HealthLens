
export function initMedReminders(meds) {
    const container = document.getElementById("med-reminders-list");
    if (!container) return;

    if (!meds || meds.length === 0) {
        container.innerHTML = "<div style='color:#888; font-style:italic;'>No active medications.</div>";
        return;
    }

    container.innerHTML = "";

    // Check Notification Permission
    if ("Notification" in window && Notification.permission !== "granted") {
        const btn = document.createElement("button");
        btn.innerHTML = "🔔 <strong>Enable Reminders</strong>";
        btn.style.cssText = "background:var(--primary); color:white; border:none; padding:8px 12px; border-radius:6px; font-size:0.9rem; margin-bottom:15px; cursor:pointer; width:100%; transition:all 0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.1);";

        btn.onmouseover = () => { btn.style.transform = "translateY(-1px)"; btn.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)"; };
        btn.onmouseout = () => { btn.style.transform = "none"; btn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"; };

        btn.onclick = () => {
            Notification.requestPermission().then(perm => {
                if (perm === "granted") {
                    btn.remove();
                    // Optional: Refresh list to show scheduled status
                    initMedReminders(meds);
                }
            });
        };
        container.appendChild(btn);
    }

    meds.forEach(med => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:10px; background: var(--bg-card); border:1px solid #eee; border-radius:8px; margin-bottom:8px;";

        const id = "med_" + med.id; // Assuming med has ID or use name
        const today = new Date().toDateString();
        const storedKey = `taken_${id}_${today}`;
        const isTaken = localStorage.getItem(storedKey) === "true";

        row.innerHTML = `
            <div>
                <div style="font-weight:600; color:var(--text-main);">${med.medicine}</div>
                <div style="font-size:0.85rem; color:#666;">${med.dosage} • ${med.frequency}</div>
            </div>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="${id}" ${isTaken ? "checked" : ""} style="transform:scale(1.3); accent-color:var(--primary);">
                <span style="font-size:0.9rem;">Taken</span>
            </label>
        `;

        // Event Listener for Checkbox
        const checkbox = row.querySelector("input");
        checkbox.onchange = (e) => {
            if (e.target.checked) {
                localStorage.setItem(storedKey, "true");
                // Celebrate
                alert(`Great job taking your ${med.medicine}! ✅`);
            } else {
                localStorage.removeItem(storedKey);
            }
        };

        container.appendChild(row);

        // Schedule Reminder (Mock logic: if not taken by X time, notify)
        // For demo, we'll just check on load
        if (!isTaken && "Notification" in window && Notification.permission === "granted") {
            // In a real app, this would be a Service Worker or setTimout calculation
            // console.log(`Reminder scheduled for ${med.medicine}`);
        }
    });
}
