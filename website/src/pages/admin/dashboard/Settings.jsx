import { useState } from 'react';

import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import useEntered from '../../../ui/custom/motion/useEntered';
import { useAppSelector } from '../../../store/slices/hooks';
import { selectIsAdmin } from '../../../store/slices/authSlice';
import useSession from '../../../router/useSession';
import ProfileTab from '../../../components/admin/settings/ProfileTab';
import DevicesTab from '../../../components/admin/settings/DevicesTab';
import AccessTab from '../../../components/admin/settings/AccessTab';
import LayoutTab from '../../../components/admin/settings/LayoutTab';
import { Ico, tabIcon } from '../../../components/admin/settings/SettingsParts';
import PageHeader from '../../../ui/custom/PageHeader';

// created once, so the tab icons keep a stable identity between renders
const ProfileIcon = tabIcon('user', 3);
const DevicesIcon = tabIcon('wrist_watch', 5);
const TeamIcon = tabIcon('crown', 8);
const LayoutIcon = tabIcon('layers', 6);

function Settings() {
  const isAdmin = useAppSelector(selectIsAdmin);
  const { isStaff } = useSession();
  const entered = useEntered();
  const [tab, setTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: ProfileIcon },
    { id: 'devices', label: 'Devices', icon: DevicesIcon },
    ...(isAdmin ? [{ id: 'access', label: 'Team access', icon: TeamIcon }] : []),
    // admin, manager and support open this tab; what each of them may change depends on their rank
    ...(isStaff ? [{ id: 'layout', label: 'Layout & access', icon: LayoutIcon }] : []),
  ];
  const active = tabs.some((t) => t.id === tab) ? tab : 'profile';

  return (
    <div className={`space-y-5 transition-opacity duration-300 motion-reduce:transition-none ${entered ? 'opacity-100' : 'opacity-0'}`}>
      <PageHeader
        art="settings"
        title="Settings"
        subtitle="Manage your profile, security, and workspace access."
        // actions={(
        //   <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-border bg-surface shadow-soft sm:size-16">
        //     <Ico name="settings_gear" tone={8} className="size-9 sm:size-10" />
        //   </span>
        // )}
      />

      <Tabs tabs={tabs} value={active} onChange={setTab} />

      <TabPanel key={active}>
        {active === 'profile' && <ProfileTab />}
        {active === 'devices' && <DevicesTab />}
        {active === 'access' && isAdmin && <AccessTab />}
        {active === 'layout' && isStaff && <LayoutTab />}
      </TabPanel>
    </div>
  );
}

export default Settings;
