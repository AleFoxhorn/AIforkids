// Internal generation-service contract. Map provider billing codes to these
// explicit codes in the backend adapter; HTTP 429 alone is not a billing error.
const exhaustedCodes=new Set(['insufficient_quota','insufficient_balance','quota_exhausted']);
export function isGenerationQuotaError(error){
  const code=error?.error?.code??error?.code;
  return typeof code==='string'&&exhaustedCodes.has(code.toLowerCase());
}
export function showGenerationQuotaError(error,dialog){
  if(!isGenerationQuotaError(error))return false;
  if(!dialog.open)dialog.showModal();
  return true;
}
