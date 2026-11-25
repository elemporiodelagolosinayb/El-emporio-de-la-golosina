import Swal from 'sweetalert2';

/** SweetAlert2 con los colores de la marca */
const base = Swal.mixin({
  confirmButtonColor: '#CE5487',
  cancelButtonColor: '#286C84',
  customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-full', cancelButton: 'rounded-full', denyButton: 'rounded-full' },
  buttonsStyling: true,
});

export const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
});

export const notifySuccess = (title) => toast.fire({ icon: 'success', title });
export const notifyError = (title) => toast.fire({ icon: 'error', title });
export const alertError = (text, title = 'Ups…') => base.fire({ icon: 'error', title, text });
export const alertInfo = (title, html) => base.fire({ icon: 'info', title, html });

/** Confirmación genérica de eliminación */
export async function confirmDelete(what, extra = '') {
  const r = await base.fire({
    icon: 'warning',
    title: `¿Seguro que querés eliminar ${what}?`,
    html: `Esta acción no se puede deshacer.${extra ? `<br><br>${extra}` : ''}`,
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    focusCancel: true,
  });
  return r.isConfirmed;
}

export const confirmAction = async (title, text, confirmButtonText = 'Confirmar') =>
  (await base.fire({ icon: 'question', title, text, showCancelButton: true, confirmButtonText, cancelButtonText: 'Cancelar' })).isConfirmed;

export default base;
