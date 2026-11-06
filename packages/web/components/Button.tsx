import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** design-system Button (nl-btn). A real <button>; an icon only sits beside a word. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'md' | 'xl';
  icon?: IconName;
  compact?: boolean;
  /** Switch scanning has this button lit. */
  lit?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, compact, lit, className, children, type = 'button', ...rest },
  ref,
) {
  const cls = [
    'nl-btn',
    `nl-btn--${variant}`,
    size === 'xl' ? 'nl-btn--xl' : '',
    compact ? 'nl-btn--compact' : '',
    lit ? 'is-lit' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
});
