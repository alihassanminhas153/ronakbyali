export default function PanelPageTitle({ className = '', children }) {
  return (
    <h1 className={`min-w-0 ${className}`}>{children}</h1>
  );
}
