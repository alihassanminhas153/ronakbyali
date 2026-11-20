import { useState } from 'react';
import { LayoutPanelLeft, MonitorSmartphone, UserRound, UsersRound } from 'lucide-react';

import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import useEntered from '../../../ui/custom/motion/useEntered';
import PageHeader from '../../../ui/custom/PageHeader';
import { useAppSelector } from '../../../store/slices/hooks';
import { selectIsAdmin } from '../../../store/slices/authSlice';
import useSession from '../../../router/useSession';
import DevicesTab from '../../../components/admin/settings/DevicesTab';
import AccessTab from '../../../components/admin/settings/AccessTab';
import LayoutTab from '../../../components/admin/settings/LayoutTab';
import ProfileTab from '../../../components/admin/settings/ProfileTab';

// Admin > Settings
// Tab order: Devices, Team access, Layout & access, Profile. Devices opens first.
// Tabs use the same shape as the Finance page: lucide icon + an accent-tone colour from index.css.
function Settings() {
  const isAdmin = useAppSelector(selectIsAdmin);
  const { isStaff } = useSession();
  const entered = useEntered();
  const [tab, setTab] = useState('devices');

  const tabs = [
    { id: 'devices', label: 'Devices', icon: MonitorSmartphone, color: 'var(--accent-tone-5)' },
    ...(isAdmin ? [{ id: 'access', label: 'Team access', icon: UsersRound, color: 'var(--accent-tone-8)' }] : []),
    // admin, manager and support open this tab; what each may change depends on their rank
    ...(isStaff ? [{ id: 'layout', label: 'Layout & access', icon: LayoutPanelLeft, color: 'var(--accent-tone-6)' }] : []),
    { id: 'profile', label: 'Profile', icon: UserRound, color: 'var(--accent-tone-1)' },
  ];
  // if the open tab disappears (e.g. role changed) fall back to the first one, which is Devices
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;

  return (
    <div className={`space-y-5 transition-opacity duration-300 motion-reduce:transition-none ${entered ? 'opacity-100' : 'opacity-0'}`}>
      <PageHeader
        art="settings"
        title="Settings"
        subtitle="Your sessions, team access, workspace layout and profile in one place."
      />

      <Tabs tabs={tabs} value={active} onChange={setTab} />

      <TabPanel key={active}>
        {active === 'devices' && <DevicesTab />}
        {active === 'access' && isAdmin && <AccessTab />}
        {active === 'layout' && isStaff && <LayoutTab />}
        {active === 'profile' && <ProfileTab />}
      </TabPanel>
    </div>
  );
}

export default Settings;