import { useState } from 'react';

import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import useEntered from '../../../ui/custom/motion/useEntered';
import { useAppSelector } from '../../../store/slices/hooks';
import { selectIsAdmin } from '../../../store/slices/authSlice';
import ProfileTab from '../../../components/admin/settings/ProfileTab';
import DevicesTab from '../../../components/admin/settings/DevicesTab';
import AccessTab from '../../../components/admin/settings/AccessTab';
import { Ico, tabIcon } from '../../../components/admin/settings/SettingsParts';
import PageHeader from '../../../ui/custom/PageHeader';

// created once, so the tab icons keep a stable identity between renders
const ProfileIcon = tabIcon('user', 3);
const DevicesIcon = tabIcon('wrist_watch', 5);
const TeamIcon = tabIcon('crown', 8);

function Settings() {
  const isAdmin = useAppSelector(selectIsAdmin);
  const entered = useEntered();
  const [tab, setTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: ProfileIcon },
    { id: 'devices', label: 'Devices', icon: DevicesIcon },
    ...(isAdmin ? [{ id: 'access', label: 'Team access', icon: TeamIcon }] : []),
  ];
  const active = tabs.some((t) => t.id === tab) ? tab : 'profile';

  return (
    <div className={`space-y-5 transition-opacity duration-300 motion-reduce:transition-none ${entered ? 'opacity-100' : 'opacity-0'}`}>
      <PageHeader
        art="settings"
        title="Settings"
        subtitle="Manage your profile, security, and workspace access."
        actions={(
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-border bg-surface shadow-soft sm:size-16">
            <Ico name="settings_gear" tone={8} className="size-9 sm:size-10" />
          </span>
        )}
      />

      <section
        style={{ background: 'linear-gradient(120deg, var(--brown), var(--accent))' }}
        className="group relative isolate flex min-h-28 items-center gap-4 overflow-hidden rounded-2xl p-4 text-white shadow-soft sm:gap-6 sm:p-6"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-40 hidden size-32 rounded-full bg-white/[0.07] sm:block" />
        <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/15 sm:size-16">
          <Ico name="settings_gear" hueRotate={false} className="size-9 sm:size-10" />
        </span>
        <div className="relative min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Account center</p>
          <p className="heading mt-1 text-xl sm:text-2xl">{tabs.find((t) => t.id === active)?.label || 'Profile'} settings</p>
          <p className="mt-1 hidden text-sm text-white/75 sm:block">Your details and preferences, together in one place.</p>
        </div>
      </section>

      <Tabs tabs={tabs} value={active} onChange={setTab} />

      <TabPanel key={active}>
        {active === 'profile' && <ProfileTab />}
        {active === 'devices' && <DevicesTab />}
        {active === 'access' && isAdmin && <AccessTab />}
      </TabPanel>
    </div>
  );
}

export default Settings;
