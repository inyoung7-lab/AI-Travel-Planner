import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listExperiences } from './experienceRepository.js';
import { LANGUAGE_FRIENDS_DEMO } from './languageFriendsDemo.js';
import { composeCatalogExperiences, isLanguageFriendsDemoMode } from './catalogExperienceSource.js';
import { hasLocalizedField, localizedField, translate } from './localEumI18n.js';
import { setLocalEumLocale, useLocalEumLocale } from './localEumLocaleStore.js';
import LocalEumLanguageSelector from './components/LocalEumLanguageSelector.jsx';
import {
  CATALOG_INTERESTS,
  catalogRecruitingOnly,
  catalogDeliveryLanguages,
  filterCatalogExperiences,
  formatKst,
  formatWon,
  hasCatalogLanguageMetadata,
  orderedSessions,
  REGION_LABELS,
  regionLabel,
  sessionDuration,
  sortCatalogExperiences,
} from './experiencePresentation.js';
import ExperienceImage from './components/ExperienceImage.jsx';
import './Traveler.css';

const PROGRAM_LANGUAGES = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

const INTEREST_MESSAGE_KEYS = {
  MARKET_FOOD: 'interestMarketFood', NEIGHBORHOOD: 'interestNeighborhood',
  TRADITION_HISTORY: 'interestHistory', NATURE_OUTDOOR: 'interestNature',
  LANGUAGE_FRIENDS: 'interestLanguage', CRAFTS: 'interestCraft',
};

function filtersFromParams(params) {
  const demoMode = isLanguageFriendsDemoMode(params);
  const explicitLanguages = params.getAll('programLanguage').flatMap(value => value.split(','));
  const programLanguages = [...new Set(explicitLanguages
    .filter(value => PROGRAM_LANGUAGES.some(language => language.value === value)))];
  return {
    region: REGION_LABELS[params.get('region')] ? params.get('region') : '',
    programLanguages,
    interest: CATALOG_INTERESTS.some(item => item.value === params.get('interest')) ? params.get('interest') : (demoMode ? 'LANGUAGE_FRIENDS' : ''),
    recruitingOnly: catalogRecruitingOnly(params),
    sort: params.get('sort') === 'newest' ? 'newest' : 'recommended',
  };
}

function CatalogFilterPanel({ initialFilters, onApply, locale, languageFilterAvailable, availableProgramLanguages }) {
  const [draft, setDraft] = useState(initialFilters);
  const t = (key, params) => translate(locale, key, params);
  function submit(event) {
    event.preventDefault();
    onApply(draft);
  }

  return <aside className="let-filter-panel" aria-labelledby="let-filter-heading">
    <form onSubmit={submit}>
      <h2 id="let-filter-heading">{t('searchFilters')}</h2>
      <LocalEumLanguageSelector locale={locale} onChange={setLocalEumLocale} />
      <label className="let-filter-label" htmlFor="let-region-filter">{t('region')}</label>
      <select id="let-region-filter" className="let-region-select" value={draft.region} onChange={event => setDraft(value => ({ ...value, region: event.target.value }))}>
        <option value="">{t('allRegions')}</option>
        {Object.keys(REGION_LABELS).map(value => <option key={value} value={value}>{regionLabel(value, locale)}</option>)}
      </select>

      <fieldset className="let-filter-group">
        <legend>{t('programLanguage')}</legend>
        <div className="let-program-language-options">
          {PROGRAM_LANGUAGES.map(({ value, label }) => <button key={value} type="button" disabled={!languageFilterAvailable || !availableProgramLanguages.has(value)} aria-pressed={draft.programLanguages.includes(value)} className={draft.programLanguages.includes(value) ? 'is-selected' : ''} onClick={() => setDraft(current => ({ ...current, programLanguages: current.programLanguages.includes(value) ? current.programLanguages.filter(item => item !== value) : [...current.programLanguages, value] }))}>{label}</button>)}
        </div>
        <p className="let-filter-hint">{t(!languageFilterAvailable ? 'languageFilterUnavailable' : availableProgramLanguages.size ? 'languageFilterHint' : 'languageFilterNone')}</p>
      </fieldset>

      <fieldset className="let-filter-group">
        <legend>{t('interest')}</legend>
        <div className="let-interest-options">
          {CATALOG_INTERESTS.map(item => <button key={item.value} type="button" aria-pressed={draft.interest === item.value} className={draft.interest === item.value ? 'is-selected' : ''} onClick={() => setDraft(current => {
            const interest = current.interest === item.value ? '' : item.value;
            return { ...current, interest, ...(interest === 'LANGUAGE_FRIENDS' ? { recruitingOnly: false } : {}) };
          })}>{t(INTEREST_MESSAGE_KEYS[item.value])}</button>)}
        </div>
      </fieldset>

      <label className="let-recruiting-toggle"><span>{t('recruitingOnly')}</span><input type="checkbox" checked={draft.recruitingOnly} onChange={event => setDraft(value => ({ ...value, recruitingOnly: event.target.checked }))} /><span className="let-toggle-track" aria-hidden="true" /></label>
      <button type="submit" className="let-filter-submit">{t('searchByConditions')}</button>
    </form>
  </aside>;
}

export default function ExperienceCatalog() {
  const [params, setParams] = useSearchParams();
  const locale = useLocalEumLocale();
  const t = (key, values) => translate(locale, key, values);
  const [state, setState] = useState({ items: [], loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  const demoMode = isLanguageFriendsDemoMode(params);
  const filters = filtersFromParams(params);
  const demoIds = new Set(LANGUAGE_FRIENDS_DEMO.map(item => String(item.experience_id)));
  const catalogItems = composeCatalogExperiences({
    publishedExperiences: state.items,
    demoExperiences: LANGUAGE_FRIENDS_DEMO,
    demoMode,
  });
  const catalogLoading = state.loading;
  const catalogError = state.error;
  const languageFilterAvailable = hasCatalogLanguageMetadata(catalogItems);
  const availableProgramLanguages = catalogDeliveryLanguages(catalogItems);
  const effectiveFilters = { ...filters, programLanguages: languageFilterAvailable
    ? filters.programLanguages.filter(language => availableProgramLanguages.has(language)) : [] };

  useEffect(() => {
    let active = true;
    listExperiences().then(items => { if (active) setState({ items, loading: false, error: '' }); })
      .catch(error => { if (active) setState({ items: [], loading: false, error: error.message }); });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setRevision(value => value + 1); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  useEffect(() => {
    if (catalogLoading || catalogError || !params.has('programLanguage')) return;
    const retainedLanguages = languageFilterAvailable
      ? filters.programLanguages.filter(language => availableProgramLanguages.has(language)) : [];
    if (retainedLanguages.length === filters.programLanguages.length) return;
    const next = new URLSearchParams(params);
    next.delete('programLanguage');
    retainedLanguages.forEach(language => next.append('programLanguage', language));
    setParams(next, { replace: true });
  }, [availableProgramLanguages, catalogError, catalogLoading, filters.programLanguages, languageFilterAvailable, params, setParams]);

  function applyFilters(draft) {
    const next = new URLSearchParams();
    if (draft.region) next.set('region', draft.region);
    draft.programLanguages.forEach(language => next.append('programLanguage', language));
    if (draft.interest) next.set('interest', draft.interest);
    if (isLanguageFriendsDemoMode(params) && draft.interest === 'LANGUAGE_FRIENDS') next.set('demo', 'language-friends');
    next.set('recruiting', draft.recruitingOnly ? 'on' : 'off');
    if (draft.sort === 'newest') next.set('sort', 'newest');
    setParams(next, { replace: true });
  }

  function updateSort(sort) {
    const next = new URLSearchParams(params);
    if (sort === 'newest') next.set('sort', 'newest');
    else next.delete('sort');
    setParams(next, { replace: true });
  }

  const visible = sortCatalogExperiences(
    filterCatalogExperiences(catalogItems, effectiveFilters),
    effectiveFilters.sort,
  );

  return <main className="le-traveler"><div className="let-shell">
    <div className="let-topline"><Link to="/local-eum" className="let-wordmark">LOCAL EUM <span>{t('localEum')}</span></Link><Link to="/local-eum/host/profile" className="let-host-link">{t('hostProfile')} ↗</Link></div>
    <div className="let-breadcrumb"><Link to="/">{translate(locale, 'home')}</Link><span>/</span><span>{t('localEum')}</span><span>/</span><span>{t('findExperience')}</span></div>
    <section className="let-catalog-heading"><div><span className="let-overline">FIND YOUR EXPERIENCE</span><h1>{t('findExperience')}</h1><p>{t('catalogSubtitle')}</p></div><span className="let-total-count">{t('experiencesCount', { count: catalogItems.length })}</span></section>

    <div className="let-catalog-layout">
      <CatalogFilterPanel key={params.toString()} initialFilters={effectiveFilters} onApply={applyFilters} locale={locale} languageFilterAvailable={languageFilterAvailable} availableProgramLanguages={availableProgramLanguages} />

      <section className="let-catalog-results" aria-labelledby="let-results-heading">
        <div className="let-results-toolbar"><h2 id="let-results-heading">{t('recommendedExperiences')}</h2><div className="let-results-controls"><span className="let-results-count" role="status">{catalogLoading ? t('loadingExperiences') : catalogError ? t('needsAttention') : t('experiencesCount', { count: visible.length })}</span><label className="let-sort-label"><span className="let-sr-only">{t('sortBy')}</span><select value={filters.sort} onChange={event => updateSort(event.target.value)}><option value="recommended">{t('recommendedSort')}</option><option value="newest">{t('newestSort')}</option></select></label><button type="button" className="let-refresh-button" onClick={() => setRevision(value => value + 1)}>{t('refresh')} ↻</button></div></div>
        {!catalogLoading && !catalogError && !demoMode && (!languageFilterAvailable || !availableProgramLanguages.size) ? <p className="let-language-filter-notice" role="status">{t(!languageFilterAvailable ? 'languageFilterUnavailable' : 'languageFilterNone')}</p> : null}
        {catalogError ? <div className="let-empty" role="alert"><h3>{t('catalogLoadError')}</h3><p>{catalogError}</p><button type="button" className="let-button" onClick={() => setRevision(value => value + 1)}>{t('retry')}</button></div> : null}
        {!catalogLoading && !catalogError && !visible.length ? <div className="let-empty"><h3>{t('noMatchingExperiences')}</h3><p>{t('changeFilters')}</p><button type="button" className="let-button" onClick={() => setParams({})}>{t('viewAllExperiences')}</button>{filters.interest === 'LANGUAGE_FRIENDS' && !demoMode ? <button type="button" className="let-button" onClick={() => setParams({ interest: 'LANGUAGE_FRIENDS', demo: 'language-friends', recruiting: 'off' })}>{t('viewLanguageFriendsDemo')}</button> : null}</div> : null}
        <div className="let-card-grid">{visible.map(experience => {
          const nextSession = orderedSessions(experience.sessions)[0] || experience.sessions?.[0];
          const title = localizedField(experience, 'title', locale);
          const description = localizedField(experience, 'description', locale);
          const isLanguageFriendsDemo = demoIds.has(String(experience.experience_id));
          const needsTranslation = !isLanguageFriendsDemo && locale !== 'ko' && (!hasLocalizedField(experience, 'title', locale) || !hasLocalizedField(experience, 'description', locale));
          const detailUrl = isLanguageFriendsDemo ? `/local-eum/experiences/${experience.experience_id}?demo=language-friends` : `/local-eum/experiences/${experience.experience_id}`;
          return <Link className="let-experience-card" key={experience.experience_id} to={detailUrl}>
            <div className="let-card-image"><ExperienceImage src={experience.hero_image_url} alt={experience.hero_image_alt || ''} /><span className="let-image-badge">{regionLabel(experience.region_code, locale)}</span></div>
            <div className="let-card-body"><h3>{title}</h3><p>{description || t('experiencePreparing')}</p>{needsTranslation ? <small className="let-translation-notice">{t('translationPending')}</small> : null}<div className="let-card-meta"><span>{nextSession ? formatKst(nextSession.starts_at, undefined, locale) : t('noUpcomingSession')}</span>{nextSession ? <span>{t('minutes', { count: sessionDuration(nextSession) })} · {t('maxPeople', { count: nextSession.capacity })}</span> : null}</div><div className="let-card-footer"><strong>{nextSession ? formatWon(nextSession.fee_amount, locale) : t('sessionBeingPrepared')}</strong><span aria-hidden="true">↗</span></div></div>
          </Link>;
        })}</div>
      </section>
    </div>
  </div></main>;
}
