import AppIcon from './AppIcon';

export default function PanelPageTitle({ icon, className = '', children }) {
  return (
    <h1 className={`flex min-w-0 items-center gap-3 ${className}`}>
      <AppIcon name={icon} className="size-9 shrink-0 object-contain sm:size-10" />
      <span className="min-w-0">{children}</span>
    </h1>
  );
}
