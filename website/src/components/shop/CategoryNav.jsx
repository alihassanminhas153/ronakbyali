import { toOption } from './shopMeta';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function NavItem({ active, onClick, children, tabIndex }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={tabIndex}
      aria-current={active ? 'true' : undefined}
      className={`relative flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors duration-200 motion-reduce:transition-none ${FOCUS} ${
        active ? 'bg-accent/10 font-medium text-text' : 'text-muted hover:bg-border/40 hover:text-text'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent transition-opacity duration-200 motion-reduce:transition-none ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {children}
    </button>
  );
}

// Desktop: category list on the left. The groups of the chosen category unfold beneath it.
export function CategorySidebar({ categories, groups, category, group, onCategory, onGroup }) {
  const categoryOptions = categories.map(toOption);
  const groupOptions = groups.map(toOption);

  return (
    <nav aria-label="Product categories" className="hidden lg:block">
      <h2 className="mb-3 px-3 text-sm font-semibold text-text">Categories</h2>
      <ul className="space-y-0.5">
        <li>
          <NavItem active={!category} onClick={() => onCategory(null)}>
            All products
          </NavItem>
        </li>
        {categoryOptions.map((option) => {
          const active = option.value === category;
          const open = active && groupOptions.length > 0;
          return (
            <li key={option.value}>
              <NavItem active={active && !group} onClick={() => onCategory(active ? null : option.value)}>
                {option.label}
              </NavItem>
              <div
                aria-hidden={!open}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                  open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <ul className="ml-3 min-h-0 space-y-0.5 overflow-hidden border-l border-border pl-2">
                  {active &&
                    groupOptions.map((item) => (
                      <li key={item.value}>
                        <NavItem
                          active={item.value === group}
                          tabIndex={open ? 0 : -1}
                          onClick={() => onGroup(item.value === group ? null : item.value)}
                        >
                          {item.label}
                        </NavItem>
                      </li>
                    ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-200 motion-reduce:transition-none ${FOCUS} ${
        active
          ? 'border-accent bg-accent/10 font-medium text-text'
          : 'border-border bg-surface text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

// Mobile and tablet: the same choices as a row that scrolls sideways.
export function CategoryChips({ categories, groups, category, group, onCategory, onGroup }) {
  const categoryOptions = categories.map(toOption);
  const groupOptions = groups.map(toOption);
  const scroller = 'flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

  return (
    <nav aria-label="Product categories" className="space-y-2 lg:hidden">
      <div className={scroller}>
        <Chip active={!category} onClick={() => onCategory(null)}>
          All
        </Chip>
        {categoryOptions.map((option) => (
          <Chip
            key={option.value}
            active={option.value === category}
            onClick={() => onCategory(option.value === category ? null : option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
      {category && groupOptions.length > 0 && (
        <div className={scroller}>
          {groupOptions.map((item) => (
            <Chip
              key={item.value}
              active={item.value === group}
              onClick={() => onGroup(item.value === group ? null : item.value)}
            >
              {item.label}
            </Chip>
          ))}
        </div>
      )}
    </nav>
  );
}