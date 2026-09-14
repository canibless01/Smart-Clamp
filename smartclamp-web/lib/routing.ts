export const ROLE_HOME_ROUTE: Record<string, string> = {
  tenant: '/dashboard/tenant',
  landlord: '/dashboard/landlord',
  homeowner: '/dashboard/homeowner',
  installer: '/portal/installer',
  agent: '/portal/agent',
  referrer: '/portal/referrer',
  nepa_staff: '/dashboard/nepa',
  internal_ops: '/ops',
  internal_finance: '/ops',
  internal_support: '/ops',
  internal_engineering: '/ops',
  internal_superadmin: '/ops',
};

export function getHomeRouteForRole(role: string): string {
  return ROLE_HOME_ROUTE[role] || '/dashboard/tenant';
}
