const byStartDate = (left, right) => new Date(left.starts_at) - new Date(right.starts_at);

export function buildHostOperationsModel(experiences = [], applications = [], now = new Date()) {
  const experienceById = new Map(experiences.map((experience) => [Number(experience.experience_id), experience]));
  const sessions = experiences.flatMap((experience) => (
    (experience.sessions || []).map((session) => ({ ...session, experience }))
  ));
  const sessionById = new Map(sessions.map((session) => [Number(session.session_id), session]));
  const pendingApplications = applications
    .filter((application) => sessionById.has(Number(application.session_id)))
    .map((application) => {
      const session = sessionById.get(Number(application.session_id));
      return {
        ...application,
        experienceTitle: session.experience.title,
        sessionStartsAt: session.starts_at,
        expired: application.expires_at ? new Date(application.expires_at) <= now : false,
      };
    })
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

  return {
    experiences: [...experiences].sort((left, right) => left.title.localeCompare(right.title, 'ko')),
    sessions: [...sessions].sort(byStartDate),
    applications: pendingApplications,
    experienceCount: experienceById.size,
    activeSessionCount: sessions.filter((session) => ['DRAFT', 'RECRUITING'].includes(session.status)).length,
    pendingApplicationCount: pendingApplications.filter((application) => !application.expired).length,
    upcomingSessions: sessions
      .filter((session) => session.status === 'RECRUITING' && new Date(session.starts_at) > now)
      .sort(byStartDate)
      .slice(0, 5),
  };
}

export function selectHostOperationsContext(model, experienceId, sessionId) {
  const experience = model.experiences.find((item) => Number(item.experience_id) === Number(experienceId))
    || model.experiences.find((item) => model.applications.some((application) => (item.sessions || []).some((session) => Number(session.session_id) === Number(application.session_id))))
    || model.experiences[0] || null;
  const sessions = model.sessions.filter((session) => Number(session.experience.experience_id) === Number(experience?.experience_id));
  const session = sessions.find((item) => Number(item.session_id) === Number(sessionId))
    || sessions.find((item) => model.applications.some((application) => Number(application.session_id) === Number(item.session_id)))
    || sessions.find((item) => item.status === 'RECRUITING') || sessions[0] || null;
  return { experience, sessions, session };
}

export function applicantContactHref(kind, value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (kind === 'email' && /^[^\s@<>?&#]+@[^\s@<>?&#]+\.[^\s@<>?&#]+$/.test(text)) return `mailto:${encodeURIComponent(text)}`;
  if (kind === 'phone' && /^\+?[\d ()-]{5,40}$/.test(text)) return `tel:${text.replace(/[^+\d]/g, '')}`;
  return null;
}
