// ui.js — camada de apresentação.
// A UI nunca fala direto com o IndexedDB — só via dados.js.
// Telas: Início, Treino livre, o card (3 etapas), Progresso (mapa do cérebro).

// TODO(fase-5): substituir o placeholder abaixo pela tela real de início.

/* PLACEHOLDER PROVISÓRIO — será substituído na Fase 5 */
(function renderizarPlaceholder() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <main class="splash">
      <div class="splash-synapse" aria-hidden="true">
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- nós -->
          <circle cx="80" cy="60" r="7" fill="var(--synapse)" opacity="0.9"/>
          <circle cx="32" cy="28" r="4.5" fill="var(--synapse)" opacity="0.55"/>
          <circle cx="128" cy="24" r="4.5" fill="var(--synapse)" opacity="0.55"/>
          <circle cx="20"  cy="88" r="3.5" fill="var(--signal)"  opacity="0.5"/>
          <circle cx="140" cy="86" r="3.5" fill="var(--signal)"  opacity="0.5"/>
          <circle cx="70"  cy="106" r="3"  fill="var(--synapse)" opacity="0.4"/>
          <circle cx="110" cy="104" r="3"  fill="var(--signal)"  opacity="0.4"/>
          <!-- dendritos -->
          <line x1="80" y1="60" x2="32"  y2="28"  stroke="var(--synapse)" stroke-width="1.2" opacity="0.35"/>
          <line x1="80" y1="60" x2="128" y2="24"  stroke="var(--synapse)" stroke-width="1.2" opacity="0.35"/>
          <line x1="80" y1="60" x2="20"  y2="88"  stroke="var(--signal)"  stroke-width="1"   opacity="0.3"/>
          <line x1="80" y1="60" x2="140" y2="86"  stroke="var(--signal)"  stroke-width="1"   opacity="0.3"/>
          <line x1="80" y1="60" x2="70"  y2="106" stroke="var(--synapse)" stroke-width="0.8" opacity="0.25"/>
          <line x1="80" y1="60" x2="110" y2="104" stroke="var(--signal)"  stroke-width="0.8" opacity="0.25"/>
          <line x1="32" y1="28" x2="20"  y2="88"  stroke="var(--line)"    stroke-width="0.8" opacity="0.2"/>
          <line x1="128" y1="24" x2="140" y2="86" stroke="var(--line)"    stroke-width="0.8" opacity="0.2"/>
        </svg>
      </div>

      <h1 class="splash-titulo">Sinapse</h1>
      <p class="splash-tagline">Reconhecer a habilidade. Fixar por repetição.</p>
    </main>
  `;
})();
