// Public ownership token approved by the site owner; this is not a credential.
// Scope it to the verified origin. Other deployments do not inherit ownership.
const googleTokens = {
  'https://orrery-eight-rose.vercel.app': 'QupPDnn426DpSpH_ldmf8drkSNvuGQHpFdrLc-w-1Uc',
};
export function googleVerification(origin) {
  return googleTokens[origin] ?? '';
}
