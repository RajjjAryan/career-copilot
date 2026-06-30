function firstLine(message) {
  return String(message || '').split(/\r?\n/)[0];
}

export function classifyNavigationError(message) {
  const msg = firstLine(message);

  if (/HTTP\s+(404|410)\b/i.test(msg)) {
    return { result: 'expired', reason: msg.match(/HTTP\s+(404|410)\b/i)[0].toUpperCase() };
  }

  if (/timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|ERR_NAME_NOT_RESOLVED|429|too many requests/i.test(msg)) {
    return { result: 'uncertain', reason: `transient error: ${msg}` };
  }

  return { result: 'uncertain', reason: `navigation error: ${msg}` };
}
