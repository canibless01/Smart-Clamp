"""Staff handoff requires a current permitted role; UUID possession grants nothing."""
from flask import g
from .db import one,rows,DomainError,uuid_string

def responders(c,roles):
    if g.actor['role']!='internal_superadmin':return []
    return rows(c,'SELECT id,full_name,role FROM profiles WHERE role=ANY(CAST(:roles AS user_role[])) AND onboarding_completed_at IS NOT NULL ORDER BY full_name,id LIMIT 500',roles=list(roles))

def change(c,action,current,target,roles):
    if action=='release':
        if not current:raise DomainError('not_assigned','This case is already unassigned.',409)
        if str(current)!=g.actor['id'] and g.actor['role']!='internal_superadmin':raise DomainError('forbidden','Only the assignee or an administrator can release this case.',403)
        return None
    if g.actor['role']!='internal_superadmin':raise DomainError('forbidden','Only an administrator can reassign another colleague.',403)
    uid=uuid_string(target)
    staff=one(c,'SELECT id FROM profiles WHERE id=:id AND role=ANY(CAST(:roles AS user_role[])) AND onboarding_completed_at IS NOT NULL FOR SHARE',id=uid,roles=list(roles))
    if not staff:raise DomainError('invalid_assignee','Select an onboarded reviewer with the required staff role.',400)
    if str(current)==uid:raise DomainError('already_assigned','This reviewer already owns the case.',409)
    return uid

def notify_change(c,kind,case_id,version,previous,current):
    from .work import notify
    for uid in {str(x) for x in (previous,current) if x}:
        if uid==g.actor['id']:continue
        # Do not send case access hints to a colleague whose reviewer role was revoked.
        allowed=('internal_support','internal_superadmin') if kind=='support' else ('internal_finance','internal_superadmin')
        if not one(c,'SELECT id FROM profiles WHERE id=:id AND role=ANY(CAST(:roles AS user_role[]))',id=uid,roles=list(allowed)):continue
        notify(c,uid,kind+'.assigned','A private case assignment changed. Open your case queue to review it.',kind+'-assignment:'+case_id+':'+str(version)+':'+uid)
