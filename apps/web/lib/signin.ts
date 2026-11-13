import { roleHome, safeReturnPath, storeSession } from './session';
export function finishSignin(data: any, next?: string | null) {
  if (!data.access_token) throw new Error('The sign-in provider did not return a session.');
  storeSession(data);
  const destination=safeReturnPath(next || null, roleHome[data.role] || '/dashboard/homeowner');
  if (data.onboarding_required) { location.assign('/account/complete-profile?next='+encodeURIComponent(destination)); return; }
  if (!roleHome[data.role]) throw new Error('This account needs a supported workspace.');
  const invite=sessionStorage.getItem('smartclamp_invitation');
  location.assign(invite && data.role==='tenant' ? '/join?token='+encodeURIComponent(invite) : destination);
}
