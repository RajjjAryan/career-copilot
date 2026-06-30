import { existsSync } from 'fs';
import { join } from 'path';

export function resolveProfilePath(root, options = {}) {
  const profileName = options.profile || process.env.CAREER_PROFILE;
  if (!profileName) return join(root, 'config', 'profile.yml');

  if (!/^[a-zA-Z0-9._-]+$/.test(profileName)) {
    throw new Error('Profile name may contain only letters, numbers, dot, underscore, and dash');
  }

  const namedPath = join(root, 'config', 'profiles', `${profileName}.yml`);
  if (!existsSync(namedPath)) {
    throw new Error(`Profile not found: ${namedPath}`);
  }
  return namedPath;
}
