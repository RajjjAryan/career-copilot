import YAML from 'yaml';

function firstLine(message) {
  return String(message || '').split(/\r?\n/)[0];
}

function hasExampleValue(value) {
  if (typeof value !== 'string') return false;
  return /^(your name|jane smith|your target role|your email|your location)$/i.test(value.trim());
}

export function validateProfileYaml(content) {
  if (String(content).includes('\t')) {
    return {
      ok: false,
      label: 'config/profile.yml contains tabs (YAML requires spaces)',
      fix: 'Replace all tabs with spaces in config/profile.yml',
    };
  }

  let parsed;
  try {
    parsed = YAML.parse(content);
  } catch (err) {
    return {
      ok: false,
      label: `YAML syntax error: ${firstLine(err.message)}`,
      fix: 'Fix config/profile.yml YAML syntax, then run doctor again',
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      label: 'config/profile.yml must contain a YAML object',
      fix: 'See config/profile.example.yml for the expected format',
    };
  }

  const fullName = parsed.candidate?.full_name ?? parsed.full_name;
  const targetRoles = parsed.target_roles;
  const primaryRoles = Array.isArray(targetRoles?.primary) ? targetRoles.primary : [];

  const missing = [];
  if (!fullName) missing.push('candidate.full_name');
  if (!targetRoles || primaryRoles.length === 0) missing.push('target_roles.primary');

  if (missing.length > 0) {
    return {
      ok: false,
      label: `config/profile.yml missing required fields: ${missing.join(', ')}`,
      fix: 'See config/profile.example.yml for the expected format',
    };
  }

  if (hasExampleValue(fullName) || primaryRoles.some(hasExampleValue)) {
    return {
      ok: false,
      label: 'config/profile.yml still contains example data',
      fix: 'Replace placeholder values in config/profile.yml with your real profile',
    };
  }

  return { ok: true, label: 'config/profile.yml found and valid' };
}
