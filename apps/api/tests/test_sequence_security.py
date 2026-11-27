"""Browser roles have no audit/evidence sequence privileges; backend appends still work."""
from sqlalchemy.exc import DBAPIError
from test_api import LiveIntegration
from app.db import transaction,query,scalar
class SequenceSecurityIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(SequenceSecurityIntegration,name,None)
del LiveIntegration

def test_browser_sequence_operations_are_denied(self):
 with self.app.app_context(),transaction() as c:
  for role in ('anon','authenticated'):
   for sequence in ('audit_log_id_seq','usage_event_chain_id_seq'):
    for privilege in ('USAGE','SELECT','UPDATE'):
     self.assertFalse(scalar(c,'SELECT has_sequence_privilege(:role,:sequence,:privilege)',role=role,sequence='public.'+sequence,privilege=privilege))
    for operation in ("SELECT nextval('public."+sequence+"')","SELECT setval('public."+sequence+"',1)","SELECT last_value FROM public."+sequence):
     with self.assertRaises(DBAPIError):
      with c.begin_nested():
       query(c,'SET LOCAL ROLE '+role);query(c,operation)
  query(c,"INSERT INTO audit_log(action,metadata) VALUES('sequence_security_backend_append','{}')")
SequenceSecurityIntegration.test_browser_sequence_operations_are_denied=test_browser_sequence_operations_are_denied
