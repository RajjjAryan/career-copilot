export function evaluateScriptExit(script, exitCode) {
  const name = script.name;

  if (script.expectExit !== undefined) {
    if (exitCode === script.expectExit) {
      return { level: 'pass', message: `${name} exited with expected code ${script.expectExit}` };
    }
    return { level: 'fail', message: `${name} exited with ${exitCode}, expected ${script.expectExit}` };
  }

  if (exitCode === 0) {
    return { level: 'pass', message: `${name} runs OK` };
  }

  if (script.allowFail) {
    return { level: 'warn', message: `${name} exited with error (expected without user data)` };
  }

  return { level: 'fail', message: `${name} crashed (exit code ${exitCode})` };
}
