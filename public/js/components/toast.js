/**
 * Toast notifications component
 */

let toastTimeout = null;

export function mostrarToast(titulo, mensagem, tipo = 'info') {
  const toastNotification = document.getElementById('toastNotification');
  const toastIcon = document.getElementById('toastIcon');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');

  if (!toastNotification || !toastTitle || !toastMessage) return;

  toastTitle.textContent = titulo;
  toastMessage.textContent = mensagem;
  if (toastIcon) {
    toastIcon.textContent = tipo === 'success' ? '✓' : tipo === 'error' ? '⚠️' : 'ℹ';
  }

  toastNotification.className = `toast-alert ${tipo}`;
  toastNotification.style.display = 'flex';

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastNotification.style.display = 'none';
  }, 6000);
}

export function initToast() {
  const toastCloseBtn = document.getElementById('toastCloseBtn');
  const toastNotification = document.getElementById('toastNotification');

  toastCloseBtn?.addEventListener('click', () => {
    if (toastNotification) toastNotification.style.display = 'none';
  });
}
