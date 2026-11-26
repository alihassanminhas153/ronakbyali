import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Lock, LogOut, RotateCcw, Save, ShieldCheck, ShieldOff } from 'lucide-react';

import ActionButton from '../../../ui/custom/button/ActionButton';
import TagInput from '../../../ui/custom/input/TagInput';
import navLayoutService from '../../../lib/appwrite/navLayout';
import { setPanelRows } from '../../../lib/layout/usePanelAccess';
import useUserLabels from '../../../lib/layout/useUserLabels';
import { STAFF_LABELS, canTarget } from '../../../lib/layout/accessRules';
import { AREAS, PANEL_PAGES, defaultRow, mergeRows, urlFor, visiblePages } from '../../../lib/layout/layoutRegistry';
import AllProductsBannerSettings from './AllProductsBannerSettings';
import { Banner, Chip } from './SettingsParts';
import { MAX_EXTRA_LABELS, ROLE_OPTIONS, labelsError } from './settingsMeta';

const ROLES = ROLE_OPTIONS.map((o) => o.value);
const clone = (v) => JSON.parse(JSON.stringify(v));
const sig = (r) => `${r.inSidebar}|${r.order}|${[...(r.blockedLabels || [])].sort().join(',')}`;
const byOrder = (a, b) => a.order - b.order;
const pageOf = (area, key) => PANEL_PAGES[area].find((p) => p.key === key);

// Customers, loyal customers and new users never get into the admin panel (they are sent to their own panel),
// and admin, manager and support never see the user panel (they are sent to the admin panel).
// So each panel only offers the roles that can really reach it.
const optionsFor = (area) => ROLE_OPTIONS.filter((o) => (area === 'admin') === STAFF_LABELS.includes(o.value));

// Roles that can never reach a panel. They are not offered, they cannot be typed in as custom labels,
// and any old block stored for them is dropped when the rows load.
const neverReach = (area) => ROLES.filter((r) => !optionsFor(area).some((o) => o.value === r));
const cleanRows = (area, list) => {
  const gone = neverReach(area);
  return list.map((r) => ({ ...r, blockedLabels: (r.blockedLabels || []).filter((l) => !gone.includes(l)) }));
};

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const iconBtn = `grid size-9 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 md:size-8 ${FOCUS}`;

/* ---------- small pieces ---------- */

// on/off switch. On phones it shows its state as text, from md up the column header says it.
function SidebarSwitch({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-9 items-center gap-2 rounded-full border pl-1.5 pr-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:h-auto md:border-0 md:bg-transparent md:p-0 ${FOCUS} ${
        checked ? 'border-accent/40 bg-accent-soft text-accent' : 'border-border bg-surface text-muted'
      }`}
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}>
        <span
          className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </span>
      <span className="whitespace-nowrap md:sr-only">{checked ? 'In sidebar' : 'Hidden'}</span>
    </button>
  );
}

// a realistic sidebar: brand header, nav list, user footer
function SidebarPreview({ panelLabel, pages, roles, role, onRole }) {
  return (
    <aside aria-label="Sidebar preview" className="space-y-3 lg:sticky lg:top-4">
      <div role="group" aria-label="Preview as" className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Preview as</span>
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={role === r}
            onClick={() => onRole(r)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${FOCUS} ${
              role === r ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-muted hover:border-accent'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-[18rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft lg:mx-0 lg:max-w-none">
        {/* brand */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <img
            src="/images/icons/branding/logo.webp"
            alt=""
            className="size-9 shrink-0 rounded-lg object-contain"
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden';
            }}
          />
          <p className="truncate text-sm font-semibold text-text">{panelLabel}</p>
        </div>

        {/* navigation */}
        <nav aria-label="Preview navigation" className="max-h-[28rem] overflow-y-auto p-2">
          {pages.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted">No pages visible</p>
          ) : (
            <ul className="space-y-0.5">
              {pages.map((p, i) => {
                const Icon = p.icon;
                return (
                  <li
                    key={p.key}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                      i === 0 ? 'bg-accent-soft font-medium text-accent' : 'text-muted'
                    }`}
                  >
                    {i === 0 && <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" />}
                    <Icon size={18} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{p.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* user */}
        <div className="mt-auto flex items-center gap-3 border-t border-border px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold uppercase text-accent">
            {role.charAt(0)}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-medium capitalize text-text">{role}</p>
          <LogOut size={17} className="shrink-0 text-muted" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}

/* ---------- the tab ---------- */

// Settings > Layout & access. One row per page.
//   Sidebar  (admin only)  : switch a page off and it leaves the sidebar, its URL still opens
//   Access   (any staff)   : labels that can NEVER open the page; they see "Access denied"
// Who can block whom: admin -> manager and support; manager -> support; support -> nobody on staff.
// Custom labels (e.g. vip) can be blocked by every staff role. Nobody can block their own label or a higher one.
// Every changed row has its own Discard / Save. Order is relative: saving a row that moved also saves
// the rows it swapped with, so the saved order never has duplicates.
export default function LayoutTab() {
  const myLabels = useUserLabels();
  const isAdmin = myLabels.includes('admin');

  const [area, setArea] = useState('admin');
  const [saved, setSaved] = useState(null); // { admin: rows, user: rows } as stored
  const [draft, setDraft] = useState(null); // what is on screen
  const [open, setOpen] = useState(null); // row key whose access editor is open
  const [previewAs, setPreviewAs] = useState('support');
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let live = true;
    navLayoutService.listRows().then((res) => {
      if (!live) return;
      const rows = res.ok ? res.rows : [];
      if (!res.ok) setError(`Could not read the layout table (${res.message}). Showing the defaults.`);
      const merged = { admin: cleanRows('admin', mergeRows('admin', rows)), user: cleanRows('user', mergeRows('user', rows)) };
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
  const busy = Boolean(savingKey);
  const savedOf = (key) => saved?.[area]?.find((s) => s.key === key);

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

  // put one row back to what is stored (if it moved, the order of the whole list goes back, other edits stay)
  const discardRow = (row) => {
    const base = savedOf(row.key);
    if (!base) return;
    const moved = row.order !== base.order;
    setDraft((d) => {
      const list = d[area].map((r) => {
        if (r.key === row.key) return clone(base);
        const s = savedOf(r.key);
        return moved && s ? { ...r, order: s.order } : r;
      });
      return { ...d, [area]: moved ? list.sort(byOrder) : list };
    });
  };

  const saveRow = async (row) => {
    const base = savedOf(row.key);
    if (!base || busy) return;
    const payload = [clone(row)];
    if (row.order !== base.order) {
      // the rows this one swapped with: save only their new position
      for (const r of draft[area]) {
        const s = savedOf(r.key);
        if (r.key !== row.key && s && s.order !== r.order) payload.push({ ...clone(s), order: r.order });
      }
    }
    setSavingKey(row.key);
    setError('');
    setNotice('');
    const res = await navLayoutService.saveRows(payload);
    setSavingKey(null);
    if (!res.ok) return setError(`Could not save: ${res.message}`);
    const next = { ...saved, [area]: saved[area].map((s) => payload.find((p) => p.key === s.key) || s).sort(byOrder) };
    setSaved(next);
    setPanelRows([...next.admin, ...next.user]); // sidebar and page guard update right away
    setNotice(`${row.label} saved.`);
  };

  if (!draft) return <p className="text-sm text-muted">Loading the layout…</p>;

  const panelLabel = AREAS.find((a) => a.id === area)?.label || 'Panel';
  const previewRoles = optionValues;
  const shown = visiblePages(area, rows, [previewAs]);

  return (
    <div className="space-y-4">
      {notice && <Banner kind="success" onDismiss={() => setNotice('')}>{notice}</Banner>}
      {error && <Banner kind="error" onDismiss={() => setError('')}>{error}</Banner>}

      {/* panel switch (full width on phones) + defaults */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Panel"
          className="grid w-full grid-cols-2 gap-1 rounded-xl border border-border bg-surface-alt p-1 sm:inline-grid sm:w-auto sm:min-w-[18rem]"
        >
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
              className={`truncate rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors sm:px-5 sm:py-1.5 ${FOCUS} ${
                area === id ? 'bg-accent text-on-accent shadow-soft' : 'text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {isAdmin && (
          <div className="sm:shrink-0">
            <ActionButton variant="secondary" size="sm" icon={RotateCcw} onClick={restoreDefaults} disabled={busy}>
              Reset to defaults
            </ActionButton>
          </div>
        )}
      </div>

      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-5 lg:space-y-0">
        {/* the pages: cards on phones, a table from md up */}
        <section className="md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-surface md:shadow-soft">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_6rem_minmax(0,1.3fr)_5rem] gap-4 bg-surface-alt/60 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted md:grid">
            <span>Page</span>
            <span className="text-center">Sidebar</span>
            <span>Access</span>
            <span className="text-right">Order</span>
          </div>

          <ul className="space-y-2.5 md:space-y-0">
            {rows.map((row, index) => {
              const page = pageOf(area, row.key);
              if (!page) return null;
              const Icon = page.icon;
              const extras = row.blockedLabels.filter((l) => !optionValues.includes(l));
              const unreachable = extras.filter((l) => neverReach(area).includes(String(l).toLowerCase()));
              const extrasError =
                labelsError(extras) ||
                (unreachable.length ? `${unreachable.join(', ')} can never open the ${panelLabel}, so it cannot be blocked here.` : '');
              const base = savedOf(row.key);
              const changed = Boolean(base) && sig(row) !== sig(base);
              const isOpen = open === row.key && !page.locked;
              const saving = savingKey === row.key;
              const url = urlFor(area, page);

              return (
                <li
                  key={row.key}
                  className={`relative overflow-hidden rounded-2xl border bg-surface shadow-soft md:rounded-none md:border-x-0 md:border-b-0 md:border-t md:shadow-none ${
                    changed ? 'border-accent/50' : 'border-border'
                  } ${row.inSidebar ? '' : 'bg-surface-alt/40'}`}
                >
                  {changed && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}

                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-3 px-3.5 py-3.5 md:grid-cols-[minmax(0,1.6fr)_6rem_minmax(0,1.3fr)_5rem] md:items-center md:gap-x-4 md:px-5 md:py-3">
                    {/* page: name on top, link small underneath */}
                    <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-colors ${
                          row.inSidebar ? 'border-accent/30 bg-accent-soft text-accent' : 'border-border bg-surface-alt text-muted'
                        }`}
                      >
                        <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className={`truncate text-[15px] font-semibold md:text-sm ${row.inSidebar ? 'text-text' : 'text-muted'}`}>
                          {row.label}
                        </p>
                        <p className="hidden truncate font-mono text-[11px] text-muted md:block">{url}</p>
                      </div>
                    </div>

                    {/* order */}
                    <div className="col-start-2 row-start-1 flex justify-end gap-1 md:col-start-4">
                      <button type="button" onClick={() => move(index, -1)} disabled={!isAdmin || index === 0} aria-label={`Move ${row.label} up`} className={iconBtn}>
                        <ArrowUp size={15} />
                      </button>
                      <button type="button" onClick={() => move(index, 1)} disabled={!isAdmin || index === rows.length - 1} aria-label={`Move ${row.label} down`} className={iconBtn}>
                        <ArrowDown size={15} />
                      </button>
                    </div>

                    {/* sidebar switch + access (one line on phones, two columns from md) */}
                    <div className="col-span-2 row-start-2 flex items-center gap-2 md:contents">
                      <div className="shrink-0 md:col-start-2 md:row-start-1 md:flex md:justify-center">
                        {page.locked ? (
                          <span
                            title="Always shown"
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 text-xs text-muted md:h-auto md:border-0 md:bg-transparent md:px-0"
                          >
                            <Lock size={14} aria-hidden="true" />
                            <span className="md:sr-only">Always shown</span>
                          </span>
                        ) : (
                          <SidebarSwitch
                            checked={row.inSidebar}
                            disabled={!isAdmin}
                            onChange={(v) => patch(row.key, { inSidebar: v })}
                            label={`Show ${row.label} in the sidebar`}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 md:col-start-3 md:row-start-1 md:flex-none">
                        {page.locked ? (
                          <Chip>Always open</Chip>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : row.key)}
                            aria-expanded={isOpen}
                            className={`inline-flex h-9 w-full max-w-full items-center justify-between gap-2 rounded-full border px-3 text-xs font-medium transition-colors md:w-auto md:justify-start md:py-0 ${FOCUS} ${
                              isOpen ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-text hover:border-accent'
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {row.blockedLabels.length === 0 ? (
                                <>
                                  <ShieldCheck size={14} className="shrink-0 text-accent" aria-hidden="true" />
                                  <span className="truncate">Open to all</span>
                                </>
                              ) : (
                                <>
                                  <ShieldOff size={14} className="shrink-0 text-error" aria-hidden="true" />
                                  <span className="truncate capitalize">
                                    {row.blockedLabels.slice(0, 2).join(', ')}
                                    {row.blockedLabels.length > 2 && ` +${row.blockedLabels.length - 2}`}
                                  </span>
                                </>
                              )}
                            </span>
                            <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* link, small, at the bottom (phones only) */}
                    <p className="col-span-2 row-start-3 truncate font-mono text-[11px] text-muted md:hidden">{url}</p>
                  </div>

                  {/* access editor */}
                  {isOpen && (
                    <div className="space-y-3 border-t border-border bg-surface-alt/40 px-3.5 py-3.5 md:px-5">
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
                              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${FOCUS} ${
                                blocked ? 'border-error/50 bg-error/10 text-error' : 'border-border bg-surface text-text enabled:hover:border-accent'
                              }`}
                            >
                              {!allowed ? (
                                <Lock size={17} className="shrink-0 text-muted" aria-hidden="true" />
                              ) : blocked ? (
                                <ShieldOff size={17} className="shrink-0" aria-hidden="true" />
                              ) : (
                                <ShieldCheck size={17} className="shrink-0 text-accent" aria-hidden="true" />
                              )}
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium capitalize">{value}</span>
                                <span className="block truncate text-xs opacity-80">
                                  {!allowed ? 'Locked' : blocked ? 'Blocked' : 'Can open'}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <TagInput
                        label="Other labels"
                        value={extras}
                        onChange={(next) => patch(row.key, { blockedLabels: [...row.blockedLabels.filter((l) => optionValues.includes(l)), ...next] })}
                        max={MAX_EXTRA_LABELS}
                        maxLength={36}
                        placeholder="e.g. vip, wholesale"
                        error={extrasError}
                      />
                    </div>
                  )}

                  {/* save / discard: only on a row that changed */}
                  {changed && (
                    <div className="flex items-center justify-between gap-3 border-t border-accent/20 bg-accent-soft/60 px-3.5 py-2.5 md:px-5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
                        Unsaved
                      </span>
                      <div className="flex items-center gap-2">
                        <ActionButton variant="secondary" size="sm" onClick={() => discardRow(row)} disabled={busy}>
                          Discard
                        </ActionButton>
                        <ActionButton
                          variant="primary"
                          size="sm"
                          icon={Save}
                          onClick={() => saveRow(row)}
                          disabled={Boolean(extrasError) || (busy && !saving)}
                          loading={saving}
                        >
                          Save
                        </ActionButton>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <SidebarPreview panelLabel={panelLabel} pages={shown} roles={previewRoles} role={previewAs} onRole={setPreviewAs} />
      </div>

      {isAdmin && <AllProductsBannerSettings />}
    </div>
  );
}