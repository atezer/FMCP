/**
 * LoginScreen — Generated from Figma via FMCP
 * Source: Login / Mobile (node: 5:112)
 * Tokens: tokens.css (CSS Custom Properties)
 * A11y: WCAG AA compliant, focus order verified
 */

import React, { useState } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'disabled';
  label: string;
  onClick?: () => void;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', label, onClick, fullWidth }) => {
  const baseClasses = 'flex items-center justify-center gap-[var(--btn-gap)] font-medium text-[var(--btn-font-size)] rounded-[var(--btn-radius)] min-h-[var(--btn-min-height)] transition-colors';
  const paddingClasses = 'px-[var(--btn-padding-x)] py-[var(--btn-padding-y)]';
  const widthClass = fullWidth ? 'w-full' : '';

  const variantStyles: Record<string, string> = {
    primary: 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)]',
    secondary: 'bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] border border-[var(--btn-secondary-border)]',
    outline: 'bg-[var(--btn-outline-bg)] text-[var(--btn-outline-text)] border-2 border-[var(--btn-outline-border)]',
    ghost: 'bg-transparent text-[var(--btn-ghost-text)]',
    disabled: 'bg-[var(--btn-disabled-bg)] text-[var(--btn-disabled-text)] border border-[var(--btn-disabled-border)] cursor-not-allowed opacity-60',
  };

  return (
    <button
      className={`${baseClasses} ${paddingClasses} ${widthClass} ${variantStyles[variant]}`}
      onClick={variant === 'disabled' ? undefined : onClick}
      disabled={variant === 'disabled'}
      aria-disabled={variant === 'disabled'}
    >
      {label}
    </button>
  );
};

interface InputFieldProps {
  label: string;
  type?: string;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, type = 'text', placeholder, autoComplete, required }) => (
  <div className="w-full">
    <label className="sr-only" htmlFor={label.toLowerCase().replace(/\s/g, '-')}>
      {label}
    </label>
    <input
      id={label.toLowerCase().replace(/\s/g, '-')}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required={required}
      className="w-full min-h-[var(--input-min-height)] px-[var(--input-padding-x)] py-[var(--input-padding-y)] bg-[var(--input-bg)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--input-border)] rounded-[var(--input-radius)] text-[var(--input-font-size)] focus:border-[var(--input-borderFocus)] focus:outline-none transition-colors"
      aria-label={label}
    />
  </div>
);

const Divider: React.FC = () => (
  <div className="flex items-center gap-[var(--section-gap)] w-full" role="presentation">
    <div className="flex-1 h-px bg-[var(--surface-border)]" />
    <span className="text-[var(--input-placeholder)] text-sm">veya</span>
    <div className="flex-1 h-px bg-[var(--surface-border)]" />
  </div>
);

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login
  };

  return (
    <div className="min-h-screen bg-[var(--surface-background)] flex flex-col items-center px-[var(--page-padding)] pt-20 pb-10">
      {/* Logo */}
      <div className="flex flex-col items-center gap-[var(--element-gap)]" aria-hidden="true">
        <div className="w-16 h-16 rounded-full bg-[var(--btn-primary-bg)]" />
        <span className="text-xl font-bold text-[var(--btn-primary-bg)]">MyApp</span>
      </div>

      <div className="h-8" />

      {/* Headings */}
      <div className="flex flex-col items-center gap-[var(--element-gap)]">
        <h1 className="text-xl font-semibold text-[var(--surface-foreground)]">
          Hoş Geldiniz
        </h1>
        <p className="text-md text-[var(--input-placeholder)]">
          Hesabınıza giriş yapın
        </p>
      </div>

      <div className="h-6" />

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--section-gap)] w-full max-w-[342px]">
        <InputField
          label="E-posta adresi"
          type="email"
          placeholder="E-posta adresi"
          autoComplete="email"
          required
        />
        <InputField
          label="Şifre"
          type="password"
          placeholder="Şifre"
          autoComplete="current-password"
          required
        />
        <Button variant="primary" label="Giriş Yap" fullWidth onClick={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)} />
        <a
          href="/forgot-password"
          className="text-center text-sm font-medium text-[var(--btn-primary-bg)] hover:underline"
        >
          Şifremi unuttum
        </a>
      </form>

      <div className="h-6" />

      <div className="w-full max-w-[342px]">
        <Divider />
      </div>

      <div className="h-6" />

      <div className="w-full max-w-[342px]">
        <Button variant="secondary" label="Google ile Giriş Yap" fullWidth />
      </div>

      <div className="h-4" />

      {/* Register */}
      <p className="text-sm">
        <span className="text-[var(--input-placeholder)]">Hesabınız yok mu? </span>
        <a href="/register" className="font-semibold text-[var(--btn-primary-bg)] hover:underline">
          Kayıt Ol
        </a>
      </p>
    </div>
  );
};

export default LoginScreen;
