import { LOCALE_OPTIONS, translate } from '../localEumI18n.js';
import './LocalEumLanguageSelector.css';

export default function LocalEumLanguageSelector({ locale, onChange, className = '', disabled = false }) {
  return <fieldset disabled={disabled} className={`le-locale-selector ${className}`.trim()}>
    <legend>{translate(locale, 'displayLanguage')}</legend>
    <div className="le-locale-selector-options">
      {LOCALE_OPTIONS.map((option) => <button
        key={option.value}
        type="button"
        aria-pressed={locale === option.value}
        className={locale === option.value ? 'is-selected' : ''}
        onClick={() => onChange(option.value)}
      >{option.label}</button>)}
    </div>
  </fieldset>;
}
