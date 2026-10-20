export function isLanguageFriendsDemoMode(searchParams) {
  return searchParams.get('demo') === 'language-friends';
}

export function composeCatalogExperiences({ publishedExperiences = [], demoExperiences = [], demoMode = false } = {}) {
  if (!demoMode) return publishedExperiences;

  const publishedCodes = new Set(publishedExperiences.map(experience => experience.demo_code).filter(Boolean));
  return [
    ...publishedExperiences,
    ...demoExperiences.filter(experience => !publishedCodes.has(experience.demo_code)),
  ];
}
