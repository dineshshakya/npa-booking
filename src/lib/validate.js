// Client-side validation for the booking form.
// The database CHECK constraints + RLS policies are the real backstop;
// these messages keep the form friendly.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function errName(v) {
  v = (v || '').trim();
  if (v.length < 2) return 'Please enter your full name.';
  if (v.length > 120) return 'Name is too long.';
  return '';
}

export function errDob(v) {
  v = (v || '').trim();
  if (!DATE_RE.test(v)) return 'Please enter your date of birth.';
  const d = new Date(v + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return 'Please enter a valid date of birth.';
  if (d > new Date()) return 'Date of birth cannot be in the future.';
  if (+v.slice(0, 4) < 1900) return 'Please enter a valid date of birth.';
  return '';
}

export function errPhone(v) {
  v = (v || '').trim();
  if ((v.replace(/\D/g, '')).length < 7) return 'Please enter a valid phone number.';
  if (v.length > 25) return 'Phone number is too long.';
  return '';
}

export function errEmail(v) {
  v = (v || '').trim();
  if (!EMAIL_RE.test(v)) return 'Please enter a valid email address.';
  if (v.length > 120) return 'Email address is too long.';
  return '';
}

export function errRequired(v, label) {
  v = (v || '').trim();
  if (!v) return `Please enter your ${label}.`;
  return '';
}

export function errZip(v) {
  v = (v || '').trim();
  if (!ZIP_RE.test(v)) return 'Please enter a valid ZIP code.';
  return '';
}

export function errReason(v) {
  v = (v || '').trim();
  if (v.length < 3) return 'Please choose a reason for your visit.';
  return '';
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

export function errImageFile(file, required) {
  if (!file) return required ? 'Please add a photo of your insurance card.' : '';
  const t = (file.type || '').toLowerCase();
  const okType = IMAGE_TYPES.includes(t) || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || '');
  if (!okType) return 'Insurance photo must be an image file (JPG/PNG).';
  if (file.size > MAX_IMAGE_BYTES) return 'Insurance photo is too large (max 5 MB).';
  return '';
}

/** Shrink a photo client-side (max 800px, JPEG) before upload. */
export function downscaleImage(file) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const max = 800;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          c.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.7);
        } catch (e) { resolve(file); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    } catch (e) { resolve(file); }
  });
}
