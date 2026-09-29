(() => {
"use strict";
const $ = s => document.querySelector(s);
const grid = $("#grid");
let data = null, filter = "all", query = "", rv = false, revealed = 0;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => Number(n).toLocaleString("fr-FR", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const rated = () => (data.candidates || []).filter(c => c.rank);
const masked = c => rv && c.rank && rated().indexOf(c) < rated().length - revealed;

async function load() {
  try {
    const r = await fetch("resultats.json?t=" + Date.now(), {cache: "no-store"});
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    if (JSON.stringify(d) !== JSON.stringify(data)) { data = d; render(); }
  } catch (e) {
    if (!data) {
      grid.innerHTML = "";
      $("#empty").hidden = false;
      $("#empty").textContent = "Les résultats n'ont pas encore été publiés.";
    }
  }
}

function card(c, i) {
  const hide = masked(c), max = data.max || 20;
  const cls = ["card", c.rank ? "r" + c.rank : "", c.status === "Retenu" && !rv ? "ret" : "", hide ? "masked" : ""].join(" ");
  const ini = esc((c.name || "?").trim().charAt(0).toUpperCase());
  const img = c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : "";
  return `<article class="${cls}" style="animation-delay:${Math.min(i, 12) * 40}ms">
    <div class="pic"><span class="ini">${ini}</span>${img}
      ${c.rank ? `<span class="rank">${c.rank}</span>` : ""}<span class="st">${esc(c.status)}</span></div>
    <div class="info">
      <h3>${hide ? "•••••" : esc(c.name) || "Sans nom"}</h3>
      <div class="score"><b>${hide ? "•,•" : fmt(c.total)}</b><span>/ ${max}</span></div>
      <div class="meter"><i style="width:${hide ? 0 : Math.min(100, c.total / max * 100)}%"></i></div></div>
  </article>`;
}

function render() {
  if (!data) return;
  const list = data.candidates || [];
  $("#title").textContent = data.title || "Concours de chant";
  document.title = "Résultats — " + (data.title || "Concours de chant");
  $("#meta").textContent = data.updatedAt ? "Mis à jour le " + new Date(data.updatedAt).toLocaleString("fr-FR", {dateStyle: "long", timeStyle: "short"}) : "";
  $("#stats").hidden = rv;
  $("#stats").innerHTML = `<span><b>${list.length}</b> participants</span><span><b>${list.filter(c => c.status === "Retenu").length}</b> retenus</span>`;
  const q = query.trim().toLowerCase();
  const shown = list.filter(c => (rv || filter === "all" || c.status === "Retenu") &&
    (!q || (c.name || "").toLowerCase().includes(q)));
  grid.innerHTML = shown.map(card).join("");
  $("#empty").hidden = shown.length > 0;
  $("#empty").textContent = list.length ? "Aucun résultat pour cette recherche." : "Aucun participant pour le moment.";
  const left = rated().length - revealed;
  $("#rvNext").disabled = left <= 0;
  $("#rvNext").textContent = left > 0 ? `Révéler le suivant (${left} restant${left > 1 ? "s" : ""})` : "Tous les résultats sont révélés";
}

function next() {
  if (!rv) return;
  const r = rated(), idx = r.length - revealed - 1;
  if (idx < 0) return;
  revealed++;
  const pos = data.candidates.indexOf(r[idx]);
  render();
  const el = grid.children[pos];
  if (el) { el.classList.add("pop"); el.scrollIntoView({behavior: "smooth", block: "center"}); }
}

function setReveal(on) {
  rv = on; revealed = 0;
  $("#rv").hidden = !on; $("#bar").classList.toggle("rv", on);
  $("#btnReveal").hidden = on;
  render();
}

document.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => {
  filter = b.dataset.f;
  document.querySelectorAll(".seg button").forEach(x => x.classList.toggle("on", x === b));
  render();
}));
$("#q").addEventListener("input", e => { query = e.target.value; render(); });
$("#btnReveal").addEventListener("click", () => setReveal(true));
$("#rvOff").addEventListener("click", () => setReveal(false));
$("#rvNext").addEventListener("click", next);
$("#rvAll").addEventListener("click", () => { revealed = rated().length; render(); });
$("#btnFull").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
});
document.addEventListener("keydown", e => {
  if (!rv || e.target.tagName === "INPUT") return;
  if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
  if (e.key === "Escape") setReveal(false);
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });

load();
setInterval(load, 10000);
})();
