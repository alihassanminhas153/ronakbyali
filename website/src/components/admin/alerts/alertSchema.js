import { ALERT_LIMITS, ALERT_TYPES } from '../../../lib/appwrite/alert';

const pad = (n) => String(n).padStart(2, '0');

// ISO string <-> value of <input type="datetime-local"> (local time)
export const isoToLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const localToIso = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const blankForm = {
  title: '',
  message: '',
  type: 'info',
  active: true,
  popup: false,
  buttonText: 'Got it',
  link: '',
  priority: '0',
  userId: '',
  startsAt: '',
  endsAt: '',
};

// alert row (or null) -> form values
export function toForm(alert) {
  if (!alert) return { ...blankForm };
  return {
    title: alert.title || '',
    message: alert.message || '',
    type: ALERT_TYPES.includes(alert.type) ? alert.type : 'info',
    active: alert.status !== 'inactive',
    popup: Boolean(alert.popup),
    buttonText: alert.buttonText || 'Got it',
    link: alert.link || '',
    priority: String(alert.priority ?? 0),
    userId: alert.userId || '',
    startsAt: isoToLocal(alert.startsAt),
    endsAt: isoToLocal(alert.endsAt),
  };
}

// form values -> data for the table
export function toPayload(form) {
  return {
    title: form.title.trim(),
    message: form.message.trim(),
    type: form.type,
    status: form.active ? 'active' : 'inactive',
    popup: form.popup,
    buttonText: form.buttonText.trim() || 'Got it',
    link: form.link.trim() || null,
    priority: Math.trunc(Number(form.priority)) || 0,
    userId: form.userId.trim() || null,
    startsAt: localToIso(form.startsAt),
    endsAt: localToIso(form.endsAt),
  };
}

// returns { field: 'message' }. Empty object = valid.
export function validate(form) {
  const e = {};
  const title = form.title.trim();
  const message = form.message.trim();
  const link = form.link.trim();

  if (!title) e.title = 'Give the alert a title.';
  else if (title.length > ALERT_LIMITS.title) e.title = `Keep it under ${ALERT_LIMITS.title} characters.`;

  if (!message) e.message = 'Write the message people will read.';
  else if (message.length > ALERT_LIMITS.message) e.message = `Keep it under ${ALERT_LIMITS.message} characters.`;

  if (link) {
    if (link.length > ALERT_LIMITS.link) e.link = `Keep it under ${ALERT_LIMITS.link} characters.`;
    else if (!/^(https?:\/\/\S+|\/\S*)$/i.test(link)) e.link = 'Use a full link (https://...) or a path starting with /.';
  }

  if (form.buttonText.trim().length > ALERT_LIMITS.buttonText) e.buttonText = `Keep it under ${ALERT_LIMITS.buttonText} characters.`;

  if (form.priority === '' || !Number.isInteger(Number(form.priority))) e.priority = 'Use a whole number.';

  const userId = form.userId.trim();
  if (userId && (userId.length > ALERT_LIMITS.userId || /\s/.test(userId))) e.userId = 'That does not look like a user id.';

  const start = form.startsAt ? new Date(form.startsAt).getTime() : null;
  const end = form.endsAt ? new Date(form.endsAt).getTime() : null;
  if (form.startsAt && Number.isNaN(start)) e.startsAt = 'Pick a valid date and time.';
  if (form.endsAt && Number.isNaN(end)) e.endsAt = 'Pick a valid date and time.';
  if (!e.endsAt && end && end <= Date.now()) e.endsAt = 'This time has already passed.';
  if (!e.endsAt && start && end && end <= start) e.endsAt = 'The end must be after the start.';

  return e;
}