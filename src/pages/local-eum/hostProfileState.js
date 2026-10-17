export function hasHostProfileChanges(current) {
  if (!current?.host || !current?.draft) return false;
  return current.draft.displayName.trim() !== current.host.display_name.trim()
    || current.draft.bio.trim() !== (current.host.bio || '').trim();
}
