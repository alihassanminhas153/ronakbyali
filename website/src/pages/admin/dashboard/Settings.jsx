import { useState } from 'react';

import Tabs, { TabPanel } from '../../../ui/custom/tabs/Tabs';
import useEntered from '../../../ui/custom/motion/useEntered';
import { useAppSelector } from '../../../store/slices/hooks';
import { selectIsAdmin } from '../../../store/slices/authSlice';
import ProfileTab from '../../../components/admin/settings/ProfileTab';
import DevicesTab from '../../../components/admin/settings/DevicesTab';
import AccessTab from '../../../components/admin/settings/AccessTab';
import { tabIcon } from '../../../components/admin/settings/SettingsParts';

// created once, so the tab icons keep a stable identity between renders
const ProfileIcon = tabIcon('user');
const DevicesIcon = tabIcon('wrist_watch');
const TeamIcon = tabIcon('crown');

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
    <div className={`space-y-4 transition-opacity duration-300 motion-reduce:transition-none ${entered ? 'opacity-100' : 'opacity-0'}`}>
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
