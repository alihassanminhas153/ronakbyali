import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, Lock, RotateCcw, Save, ShieldCheck, ShieldOff } from 'lucide-react';

import ActionButton from '../../../ui/custom/button/ActionButton';
import TagInput from '../../../ui/custom/input/TagInput';
import navLayoutService from '../../../lib/appwrite/navLayout';
import { setPanelRows } from '../../../lib/layout/usePanelAccess';
import useUserLabels from '../../../lib/layout/useUserLabels';
import { STAFF_LABELS, canTarget } from '../../../lib/layout/accessRules';
import { AREAS, PANEL_PAGES, defaultRow, mergeRows, urlFor, visiblePages } from '../../../lib/layout/layoutRegistry';
import { Banner, Chip, Ico } from './SettingsParts';
import { MAX_EXTRA_LABELS, ROLE_OPTIONS, labelsError } from './settingsMeta';

const ROLES = ROLE_OPTIONS.map((o) => o.value);
const clone = (v) => JSON.parse(JSON.stringify(v));
const sig = (r) => `${r.inSidebar}|${r.order}|${[...(r.blockedLabels || [])].sort().join(',')}`;
const pageOf = (area, key) => PANEL_PAGES[area].find((p) => p.key === key);

// Customers, loyal customers and new users never get into the admin panel (they are sent to their own panel),
// so only staff roles can be blocked from admin pages. The user panel lists every role.
const optionsFor = (area) => (area === 'admin' ? ROLE_OPTIONS.filter((o) => STAFF_LABELS.includes(o.value)) : ROLE_OPTIONS);

/* ---------- small pieces ---------- */

function Tile({ icon, tone, value, label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-surface-alt">
        <Ico name={icon} tone={tone} className="size-8" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums text-text">{value}</p>
        <p className="truncate text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

// a real tick box: tick = the page is in the sidebar
function Tick({ checked, onChange, disabled, label }) {
  return (
    <label className={`group inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={onChange} aria-label={label} />
      <span className="grid size-6 place-items-center rounded-md border border-border bg-surface text-transparent transition-colors group-hover:border-accent peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
        <Check size={14} strokeWidth={3} aria-hidden="true" />
      </span>
    </label>
  );
}

const iconBtn =
  'grid size-8 place-items-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40';

/* ---------- the tab ---------- */

// Settings > Layout & access. One row per page.
//   In sidebar  (admin only)  : untick a page and it leaves the sidebar, its URL still opens
//   Access      (any staff)   : labels that can NEVER open the page; they see "Access denied"
// Who can block whom: admin -> manager and support; manager -> support; support -> nobody on staff.
// Custom labels (e.g. vip) can be blocked by every staff role. Nobody can block their own label or a higher one.
export default function LayoutTab() {
  const myLabels = useUserLabels();
  const isAdmin = myLabels.includes('admin');
  const myRole = STAFF_LABELS.find((r) => myLabels.includes(r)) || 'staff';

  const [area, setArea] = useState('admin');
  const [saved, setSaved] = useState(null); // { admin: rows, user: rows } as stored
  const [draft, setDraft] = useState(null); // what is on screen
  const [open, setOpen] = useState(null); // row key whose access editor is open
  const [previewAs, setPreviewAs] = useState('support');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let live = true;
    navLayoutService.listRows().then((res) => {
      if (!live) return;
      const rows = res.ok ? res.rows : [];
      if (!res.ok) setError(`Could not read the layout table (${res.message}). Showing the defaults.`);
      const merged = { admin: mergeRows('admin', rows), user: mergeRows('user', rows) };
      setSaved(merged);
      setDraft(clone(merged));
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  const rows = draft?.[area] || [];
  const options = optionsFor(area);
  const optionValues = options.map((o) => o.value);
  const blockable = options.filter((o) => canTarget(myLabels, o.value)).map((o) => o.value);

  const changed = useMemo(() => {
    if (!draft || !saved) return [];
    return AREAS.flatMap(({ id }) => draft[id].filter((r) => sig(r) !== sig(saved[id].find((s) => s.key === r.key) || {})));
  }, [draft, saved]);

  const invalid = useMemo(
    () => (draft ? AREAS.some(({ id }) => draft[id].some((r) => labelsError(r.blockedLabels.filter((l) => !ROLES.includes(l))))) : false),
    [draft]
  );

  const patch = (key, changes) =>
    setDraft((d) => ({ ...d, [area]: d[area].map((r) => (r.key === key ? { ...r, ...changes } : r)) }));

  const move = (index, dir) =>
    setDraft((d) => {
      const list = [...d[area]];
      const to = index + dir;
      if (to < 0 || to >= list.length) return d;
      [list[index], list[to]] = [list[to], list[index]];
      return { ...d, [area]: list.map((r, i) => ({ ...r, order: i })) };
    });

  const toggleBlocked = (row, label) => {
    if (!canTarget(myLabels, label)) return; // not allowed to touch this label
    const has = row.blockedLabels.includes(label);
    patch(row.key, { blockedLabels: has ? row.blockedLabels.filter((l) => l !== label) : [...row.blockedLabels, label] });
  };

  const restoreDefaults = () => {
    setDraft((d) => ({ ...d, [area]: PANEL_PAGES[area].map((p, i) => defaultRow(area, p, i)) }));
    setOpen(null);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const res = await navLayoutService.saveRows(changed);
    setSaving(false);
    if (!res.ok) return setError(`Could not save: ${res.message}`);
    setSaved(clone(draft));
    setPanelRows([...draft.admin, ...draft.user]); // sidebar and page guard update right away
    setNotice('Saved. The sidebar and page access are updated.');
  };

  if (!draft) return <p className="text-sm text-muted">Loading the layout…</p>;

  const previewRoles = area === 'admin' ? STAFF_LABELS : ROLES;
  const shown = visiblePages(area, rows, [previewAs]);
  const inSidebarCount = rows.filter((r) => r.inSidebar).length;
  const restrictedCount = rows.filter((r) => r.blockedLabels.length).length;

  return (
    <div className="space-y-4">
      {notice && <Banner kind="success" onDismiss={() => setNotice('')}>{notice}</Banner>}
      {error && <Banner kind="error" onDismiss={() => setError('')}>{error}</Banner>}

      {/* toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div role="tablist" aria-label="Panel" className="inline-flex rounded-xl border border-border bg-surface-alt p-1">
          {AREAS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={area === id}
              onClick={() => {
                setArea(id);
                setOpen(null);
                setPreviewAs(id === 'admin' ? 'support' : 'customer');
              }}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                area === id ? 'bg-accent text-on-accent shadow-soft' : 'text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              changed.length ? 'bg-accent-soft text-accent' : 'bg-surface-alt text-muted'
            }`}
          >
            <span aria-hidden="true" className={`size-1.5 rounded-full ${changed.length ? 'bg-accent' : 'bg-muted'}`} />
            {changed.length ? `${changed.length} unsaved ${changed.length === 1 ? 'change' : 'changes'}` : 'All changes saved'}
          </span>
          {isAdmin && <ActionButton variant="secondary" size="sm" icon={RotateCcw} onClick={restoreDefaults}>Defaults</ActionButton>}
          <ActionButton variant="secondary" size="sm" onClick={() => setDraft(clone(saved))} disabled={!changed.length || saving}>Discard</ActionButton>
          <ActionButton variant="primary" size="sm" icon={Save} onClick={save} disabled={!changed.length || invalid} loading={saving}>
            Save changes
          </ActionButton>
        </div>
      </div>

      {/* numbers */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile icon="list" tone={3} value={rows.length} label="Pages in this panel" />
        <Tile icon="layers" tone={6} value={inSidebarCount} label="Shown in the sidebar" />
        <Tile icon="disclaimer" tone={4} value={restrictedCount} label="Pages with blocked labels" />
      </div>

      {/* how it works */}
      <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:grid-cols-2 sm:p-5">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-alt"><Ico name="layers" tone={6} className="size-6" /></span>
          <div>
            <p className="text-sm font-semibold text-text">In sidebar</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Untick a page to remove it from the sidebar. It still opens from its URL.{!isAdmin && ' Only admins can change this.'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-alt"><Ico name="crown" tone={8} className="size-6" /></span>
          <div>
            <p className="text-sm font-semibold text-text">Access</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Blocked labels see “Access denied” instead of the page. Ranks: admin, then manager, then support.
              You are <span className="font-medium capitalize text-text">{myRole}</span>
              {blockable.length ? <>, so you can block {blockable.join(' and ')} (and custom labels).</> : <>, so you can only block custom labels.</>}
              {area === 'admin' && ' Customers, loyal and new users never reach the admin panel, so they are not listed here.'}
            </p>
          </div>
        </div>
      </div>

      {/* the pages */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        <div className="hidden grid-cols-[minmax(0,1.5fr)_5.5rem_minmax(0,1.2fr)_5.5rem] gap-3 bg-surface-alt/60 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted md:grid">
          <span>Page</span>
          <span className="text-center">In sidebar</span>
          <span>Access</span>
          <span className="text-right">Order</span>
        </div>

        <ul>
          {rows.map((row, index) => {
            const page = pageOf(area, row.key);
            if (!page) return null;
            const Icon = page.icon;
            const extras = row.blockedLabels.filter((l) => !optionValues.includes(l));
            const isOpen = open === row.key && !page.locked;
            return (
              <li key={row.key} className="border-t border-border first:border-t-0 md:first:border-t">
                <div className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors sm:px-5 md:grid md:grid-cols-[minmax(0,1.5fr)_5.5rem_minmax(0,1.2fr)_5.5rem] ${row.inSidebar ? '' : 'bg-surface-alt/40'}`}>
                  {/* page */}
                  <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-colors ${
                        row.inSidebar ? 'border-accent/30 bg-accent-soft text-accent' : 'border-border bg-surface-alt text-muted'
                      }`}
                    >
                      <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${row.inSidebar ? 'text-text' : 'text-muted'}`}>{row.label}</p>
                      <p className="truncate font-mono text-[11px] text-muted">{urlFor(area, page)}</p>
                    </div>
                  </div>

                  {/* in sidebar */}
                  <div className="flex items-center gap-2 md:justify-center">
                    {page.locked ? (
                      <span title="Always shown" className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <Lock size={14} aria-hidden="true" /> <span className="md:sr-only">Always shown</span>
                      </span>
                    ) : (
                      <>
                        <Tick
                          checked={row.inSidebar}
                          disabled={!isAdmin}
                          onChange={(e) => patch(row.key, { inSidebar: e.target.checked })}
                          label={`Show ${row.label} in the sidebar`}
                        />
                        <span className="text-xs text-muted md:sr-only">In sidebar</span>
                      </>
                    )}
                  </div>

                  {/* access */}
                  <div className="min-w-0">
                    {page.locked ? (
                      <Chip>Always open</Chip>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : row.key)}
                        aria-expanded={isOpen}
                        className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                          isOpen ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-text hover:border-accent'
                        }`}
                      >
                        {row.blockedLabels.length === 0 ? (
                          <>
                            <ShieldCheck size={14} className="text-accent" aria-hidden="true" /> Open to all
                          </>
                        ) : (
                          <>
                            <ShieldOff size={14} className="text-error" aria-hidden="true" />
                            <span className="truncate capitalize">
                              {row.blockedLabels.slice(0, 2).join(', ')}
                              {row.blockedLabels.length > 2 && ` +${row.blockedLabels.length - 2}`}
                            </span>
                          </>
                        )}
                        <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* order */}
                  <div className="ml-auto flex justify-end gap-1 md:ml-0">
                    <button type="button" onClick={() => move(index, -1)} disabled={!isAdmin || index === 0} aria-label={`Move ${row.label} up`} className={iconBtn}>
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={!isAdmin || index === rows.length - 1} aria-label={`Move ${row.label} down`} className={iconBtn}>
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>

                {/* access editor */}
                {isOpen && (
                  <div className="space-y-4 border-t border-border bg-surface-alt/40 px-4 py-4 sm:px-5">
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted">Who can open “{row.label}”</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {options.map(({ value }) => {
                          const blocked = row.blockedLabels.includes(value);
                          const allowed = canTarget(myLabels, value);
                          return (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={blocked}
                              disabled={!allowed}
                              title={allowed ? undefined : 'You cannot change this label'}
                              onClick={() => toggleBlocked(row, value)}
                              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-55 ${
                                blocked ? 'border-error/50 bg-error/10 text-error' : 'border-border bg-surface text-text enabled:hover:border-accent'
                              }`}
                            >
                              {!allowed ? (
                                <Lock size={18} className="shrink-0 text-muted" aria-hidden="true" />
                              ) : blocked ? (
                                <ShieldOff size={18} className="shrink-0" aria-hidden="true" />
                              ) : (
                                <ShieldCheck size={18} className="shrink-0 text-accent" aria-hidden="true" />
                              )}
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium capitalize">{value}</span>
                                <span className="block truncate text-xs opacity-80">
                                  {!allowed ? 'Cannot be changed by you' : blocked ? 'Blocked' : 'Can open'}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <TagInput
                      label="Other labels"
                      value={extras}
                      onChange={(next) => patch(row.key, { blockedLabels: [...row.blockedLabels.filter((l) => optionValues.includes(l)), ...next] })}
                      max={MAX_EXTRA_LABELS}
                      maxLength={36}
                      placeholder="e.g. vip, wholesale"
                      error={labelsError(extras)}
                      hint="Custom Appwrite labels. Leave everything open so every label can see the page. Admins are never blocked."
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* sidebar preview */}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface-alt">
              <Ico name="user" tone={3} className="size-7" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-text">Sidebar preview</h3>
              <p className="text-xs text-muted">What someone with this label sees, unsaved changes included.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {previewRoles.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={previewAs === r}
                onClick={() => setPreviewAs(r)}
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  previewAs === r ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-muted hover:border-accent'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const Icon = p.icon;
            return (
              <li key={p.key} className="flex items-center gap-3 rounded-xl border border-border bg-surface-alt/60 px-3 py-2 text-sm text-text">
                <span className="grid size-8 place-items-center rounded-lg bg-surface text-accent">
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                </span>
                {p.label}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}