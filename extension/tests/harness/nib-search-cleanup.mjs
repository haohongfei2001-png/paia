// Attempt every owned resource's cleanup, preserving the original failure.
// A cleanup failure is still fatal when there was no earlier primary error.
export async function finishNIBSearch(primary, steps) {
 const failures = [];
 for (const [name, close] of steps) {
  try { await close(); }
  catch (error) { failures.push(error); console.error('NIB Search cleanup '+name, error?.stack || error); }
 }
 if (primary) throw primary;
 if (failures.length) throw failures[0];
}
