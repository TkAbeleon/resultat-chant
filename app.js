(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);

  const state = {
    data: null,
    sequence: [],
    retained: [],
    nonRetained: [],
    current: -1,
    phase: "loading",
    revealed: false,
    poll: null,
    raf: 0,
    mouse: { x: 0, y: 0, tx: 0, ty: 0 },
  };

  const DURATIONS = {
    retained: 5200,
    nonRetained: 3200,
    between: 650,
  };

  const fmt = (value) => Number(value ?? 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

  const numericTotal = (candidate) => {
    const total = Number(candidate?.total);
    return Number.isFinite(total) ? total : 0;
  };

  function normalizeStatus(candidate) {
    return String(candidate?.status ?? "").trim().toLowerCase();
  }

  function buildRanking(candidates) {
    const retained = [];
    const nonRetained = [];

    candidates.forEach((candidate, index) => {
      const item = { ...candidate, __sourceIndex: index };
      if (normalizeStatus(candidate) === "retenu") retained.push(item);
      else nonRetained.push(item);
    });

    // Classement déterministe : note totale décroissante, puis ordre du fichier en cas d'égalité.
    retained.sort((a, b) => numericTotal(b) - numericTotal(a) || a.__sourceIndex - b.__sourceIndex);

    retained.forEach((candidate, index) => {
      candidate.rank = index + 1;
    });

    return { retained, nonRetained };
  }

  function rankBadgeSvg(rank) {
    const numericRank = Number(rank);
    const colors = { 1: "#f2bd3f", 2: "#e3e7ee", 3: "#d18b5e", 4: "#62a8e8" };
    const accent = colors[numericRank] || "#ef5b63";
    const label = numericRank ? "Rang " + numericRank : "Éliminé";
    const mark = numericRank ? String(numericRank) : "×";
    return '<span class="rank-badge rank-' + (numericRank || "eliminated") + '" role="img" aria-label="' + label + '"><svg viewBox="0 0 80 90" aria-hidden="true" focusable="false">' +
      '<path fill="' + accent + '" d="M23 4h14l3 22-10-7-10 7zM43 4h14l3 22-10-7-10 7z"/>' +
      '<circle cx="40" cy="51" r="30" fill="rgba(8,8,10,.94)" stroke="' + accent + '" stroke-width="3"/>' +
      '<circle cx="40" cy="51" r="24" fill="' + accent + '" opacity=".18"/>' +
      '<text x="40" y="59" text-anchor="middle" fill="' + accent + '" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="800">' + mark + '</text></svg></span>';
  }

  function renderScoreRows(candidate) {
    const scores = candidate?.scores ?? {};
    const rows = [
      ["Justesse", scores.justesse],
      ["Rythme", scores.rythme],
      ["Timbre", scores.timbre],
      ["Interprétation", scores.interpretation],
    ];

    return rows.map(([label, value]) => `
      <div class="score-row">
        <span>${label}</span>
        <strong>${Number.isFinite(Number(value)) ? fmt(value) : "—"}<small>/5</small></strong>
      </div>
    `).join("");
  }

  function renderSceneCandidate(candidate, index) {
    const isRetained = normalizeStatus(candidate) === "retenu";
    const rankLabel = rankBadgeSvg(candidate.rank);

    $("#scene-rank").innerHTML = rankLabel;
    $("#scene-name").textContent = String(candidate.name ?? "Sans nom").trim() || "Sans nom";
    $("#scene-total").innerHTML = `${fmt(numericTotal(candidate))}<small>/ ${state.data?.max ?? 20}</small>`;
    $("#scene-scores").innerHTML = renderScoreRows(candidate);

    const card = $("#reveal-card");
    card.dataset.rank = candidate.rank ? String(candidate.rank) : "eliminated";
    card.dataset.status = isRetained ? "retained" : "eliminated";
    card.classList.remove("show", "reveal-retained", "reveal-eliminated");
    void card.offsetWidth;
    card.classList.add(isRetained ? "reveal-retained" : "reveal-eliminated", "show");

    const stage = $("#stage");
    stage.classList.remove("impact");
    void stage.offsetWidth;
    stage.classList.add("impact");
  }

  function setRevealLock(locked) {
    document.body.classList.toggle("reveal-lock", locked);
    document.documentElement.classList.toggle("reveal-lock", locked);
  }

  function preventRevealScroll(event) {
    if (state.phase === "revealing") event.preventDefault();
  }

  function preventRevealKeys(event) {
    if (state.phase !== "revealing") return;
    const blocked = [" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"];
    if (blocked.includes(event.key)) event.preventDefault();
  }

  function bindScrollLock() {
    document.addEventListener("wheel", preventRevealScroll, { passive: false });
    document.addEventListener("touchmove", preventRevealScroll, { passive: false });
    document.addEventListener("keydown", preventRevealKeys, false);
  }

  function startMotionLoop() {
    const camera = $("#scene-camera");
    const stage = $("#stage");
    if (!camera || !stage) return;

    const tick = () => {
      state.mouse.x += (state.mouse.tx - state.mouse.x) * 0.075;
      state.mouse.y += (state.mouse.ty - state.mouse.y) * 0.075;

      const rotateY = state.mouse.x * 4.5;
      const rotateX = state.mouse.y * -4;

      camera.style.setProperty("--parallax-x", `${rotateY.toFixed(2)}deg`);
      camera.style.setProperty("--parallax-y", `${rotateX.toFixed(2)}deg`);

      const time = performance.now() / 1000;
      stage.style.setProperty("--float-y", `${Math.sin(time * 0.65) * 4}px`);
      stage.style.setProperty("--float-r", `${Math.sin(time * 0.35) * 0.35}deg`);

      state.raf = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(tick);
  }

  function bindParallax() {
    const updateTarget = (clientX, clientY) => {
      const width = Math.max(window.innerWidth, 1);
      const height = Math.max(window.innerHeight, 1);
      state.mouse.tx = Math.max(-1, Math.min(1, (clientX - width / 2) / (width / 2)));
      state.mouse.ty = Math.max(-1, Math.min(1, (clientY - height / 2) / (height / 2)));
    };

    window.addEventListener("mousemove", (event) => updateTarget(event.clientX, event.clientY));
    window.addEventListener("mouseleave", () => {
      state.mouse.tx = 0;
      state.mouse.ty = 0;
    });
    window.addEventListener("resize", () => {
      state.mouse.tx = 0;
      state.mouse.ty = 0;
    });
  }

  function createDust() {
    const dust = $("#dust");
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 34; i += 1) {
      const particle = document.createElement("i");
      particle.style.setProperty("--x", `${Math.random() * 100}%`);
      particle.style.setProperty("--y", `${Math.random() * 100}%`);
      particle.style.setProperty("--d", `${4 + Math.random() * 7}s`);
      particle.style.setProperty("--delay", `${Math.random() * -8}s`);
      particle.style.setProperty("--s", `${0.4 + Math.random() * 1.8}`);
      fragment.appendChild(particle);
    }

    dust.appendChild(fragment);
  }

  const audioState = { element: null };

  async function startSuspenseAudio() {
    const audio = $("#suspense-audio");
    if (!audio) return false;
    audioState.element = audio;
    audio.volume = 0.42;
    try {
      await audio.play();
        $("#sound-unlock").hidden = true;
      return true;
    } catch (error) {
      $("#sound-unlock").hidden = false;
      return false;
    }
  }

  function stopSuspenseAudio() {
    const audio = audioState.element;
    if (!audio) return;
    const startVolume = audio.volume;
    const startedAt = performance.now();
    const fade = () => {
      const progress = Math.min(1, (performance.now() - startedAt) / 1000);
      audio.volume = startVolume * (1 - progress);
      if (progress < 1) requestAnimationFrame(fade);
      else { audio.pause(); audio.currentTime = 0; audio.volume = 0.42; }
    };
    requestAnimationFrame(fade);
  }

  async function loadData() {
    const response = await fetch(`resultats.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function revealSequence() {
    for (let index = 0; index < state.sequence.length; index += 1) {
      state.current = index;
      const candidate = state.sequence[index];

      renderSceneCandidate(candidate, index);

      const duration = normalizeStatus(candidate) === "retenu"
        ? DURATIONS.retained
        : DURATIONS.nonRetained;

      await wait(duration);
      if (index < state.sequence.length - 1) await wait(DURATIONS.between);
    }

    completeReveal();
  }

  function completeReveal() {
    state.revealed = true;
    state.phase = "completed";
    stopSuspenseAudio();
    setRevealLock(false);

    $("#completion").hidden = false;
    $("#reveal-scene").classList.add("done");

    const completedTitle = $("#completed-title");
    completedTitle.textContent = state.data.title || "Résultats";

    renderResults();

    if (state.poll) window.clearInterval(state.poll);
    state.poll = window.setInterval(refreshResults, 15000);
  }

  function renderResults() {
    if (!state.data) return;

    const candidates = [...state.retained, ...state.nonRetained];
    const max = Number(state.data.max ?? 20) || 20;
    const query = $("#q").value.trim().toLocaleLowerCase("fr-FR");
    const filter = $("#filter").value;

    const filtered = candidates.filter((candidate) => {
      const matchesQuery = !query
        || String(candidate.name ?? "").toLocaleLowerCase("fr-FR").includes(query);
      const matchesFilter = filter === "all"
        || (filter === "ret" && normalizeStatus(candidate) === "retenu");

      return matchesQuery && matchesFilter;
    });

    $("#stats").innerHTML = `
      <span><b>${state.data.candidates.length}</b> participants</span>
      <span><b>${state.retained.length}</b> retenus</span>
      <span><b>${state.nonRetained.length}</b> non retenus</span>
    `;

    $("#meta").textContent = state.data.updatedAt
      ? `Mis à jour le ${new Date(state.data.updatedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}`
      : "Résultats publiés";

    const grid = $("#grid");

    grid.innerHTML = filtered.map((candidate) => {
      const retained = normalizeStatus(candidate) === "retenu";
      const total = numericTotal(candidate);
      const percent = Math.max(0, Math.min(100, (total / max) * 100));

      return `
        <article class="result-card ${retained ? "retained rank-" + (candidate.rank || "none") : "eliminated rank-eliminated"}">
          <div class="result-card-top">
            <span class="result-status">${esc(candidate.status || "Statut non renseigné")}</span>
            ${candidate.rank ? `<span class="result-rank">${candidate.rank}<sup>${candidate.rank === 1 ? "er" : "e"}</sup></span>` : ""}
          </div>
          <h2>${esc(String(candidate.name ?? "Sans nom").trim() || "Sans nom")}</h2>
          <div class="result-total"><strong>${fmt(total)}</strong><span>/ ${max}</span></div>
          <div class="result-meter"><i style="width:${percent}%"></i></div>
          <div class="result-details">${renderScoreRows(candidate)}</div>
        </article>
      `;
    }).join("");

    $("#empty").hidden = filtered.length > 0;
    $("#empty").textContent = state.data.candidates.length
      ? "Aucun résultat ne correspond à cette recherche."
      : "Aucun participant.";
  }

  async function refreshResults() {
    if (state.phase !== "completed") return;

    try {
      const fresh = await loadData();
      if (JSON.stringify(fresh) === JSON.stringify(state.data)) return;

      // Une mise à jour après publication ne redémarre jamais la séquence de suspense.
      state.data = fresh;
      const ranking = buildRanking(fresh.candidates || []);
      state.retained = ranking.retained;
      state.nonRetained = ranking.nonRetained;
      renderResults();
    } catch (error) {
      console.warn("Actualisation des résultats impossible", error);
    }
  }

  function bindUI() {
    $("#q").addEventListener("input", renderResults);
    $("#filter").addEventListener("change", renderResults);
    $("#sound-unlock").addEventListener("click", () => {
      startSuspenseAudio();
    });

    $("#btnFull").addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    });
  }

  async function boot() {
    try {
      const data = await loadData();

      if (!Array.isArray(data?.candidates) || data.candidates.length === 0) {
        throw new Error("Données de résultats absentes");
      }

      state.data = data;

      const ranking = buildRanking(data.candidates);
      state.retained = ranking.retained;
      state.nonRetained = ranking.nonRetained;
      state.sequence = [...ranking.retained]
        .sort((a, b) => b.rank - a.rank)
        .concat(ranking.nonRetained);

      $("#loading").hidden = true;
      $("#reveal-scene").hidden = false;
      $("#completion").hidden = true;

      createDust();
      startMotionLoop();
      bindParallax();
      bindScrollLock();

      state.phase = "revealing";
      setRevealLock(true);
      updateSequenceLabel();

      // Tentative d'autoplay. Les navigateurs peuvent exiger un premier geste utilisateur pour l'audio.
      await startSuspenseAudio();

      await wait(900);
      await revealSequence();
    } catch (error) {
      state.phase = "error";
      setRevealLock(false);
      $("#loading").hidden = false;
      $("#reveal-scene").hidden = true;
      $("#loading").textContent = "Les résultats ne sont pas disponibles pour le moment.";
      console.error(error);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindUI();
    boot();
  });
})();
