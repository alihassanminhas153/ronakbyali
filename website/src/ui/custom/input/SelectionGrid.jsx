import { Children } from 'react';

export default function SelectionGrid({ children, className = '' }) {
  const controls = Children.toArray(children);
  const useThreeColumns = controls.length >= 6;
  const remainderTwoColumns = controls.length % 2;
  const remainderThreeColumns = controls.length % 3;
  const lastControlClass = [
    remainderTwoColumns ? 'col-span-2' : '',
    useThreeColumns && remainderThreeColumns === 1 ? 'md:col-span-3' : '',
    useThreeColumns && remainderTwoColumns && remainderThreeColumns !== 1 ? 'md:col-span-1' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`grid min-w-0 grid-cols-2 gap-3 ${useThreeColumns ? 'md:grid-cols-3' : ''} ${className}`}>
      {controls.map((control, index) => (
        <div
          key={control.key ?? index}
          className={`min-w-0 ${index === controls.length - 1 ? lastControlClass : ''}`}
        >
          {control}
        </div>
      ))}
    </div>
  );
}
