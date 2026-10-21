export function isLanguageFriendsDemoMode(searchParams) {
  return searchParams.get('demo') === 'language-friends';
}

export function includeLanguageFriendsDemoInCatalog(searchParams) {
  return isLanguageFriendsDemoMode(searchParams);
}

export function composeCatalogExperiences({ publishedExperiences = [], demoExperiences = [], demoMode = false } = {}) {
  if (!demoMode) return publishedExperiences;

  const publishedCodes = new Set(publishedExperiences.map(experience => experience.demo_code).filter(Boolean));
  const publishedIds = new Set(publishedExperiences.map(experience => String(experience.experience_id)));
  return [
    ...publishedExperiences,
    ...demoExperiences.filter(experience => !publishedCodes.has(experience.demo_code)
      && !publishedIds.has(String(experience.database_experience_id))),
  ];
}
