import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  to?: string
  className?: string
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  to,
  className = '',
  type = 'button',
  onClick,
  disabled = false,
}: ButtonProps) {
  const classes = ['cc-button', `cc-button-${variant}`, className].filter(Boolean).join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
