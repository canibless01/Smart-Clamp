"""Authenticated modem counters, honest unknowns, and scoped operational aggregates."""
from datetime import datetime,timezone,timedelta
import uuid
from test_api import LiveIntegration
class OperationsIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(OperationsIntegration,name,None)
del LiveIntegration

def test_reported_modem_counters_and_aggregate_scope(self):
 owner=self.user('homeowner');ops=self.promote(self.user('homeowner'),'internal_ops');gateway=self.provision(owner,'pole_gateway');house=self.provision(owner);now=datetime.now(timezone.utc);session=uuid.uuid4().hex
 transport={'counter_session':session,'rx_bytes':1000,'tx_bytes':300,'signal_dbm':-75,'network_type':'4g'}
 self.assertEqual(self.client.get('/api/v1/ops/summary',headers=self.headers(owner)).status_code,403)
 baseline=self.client.get('/api/v1/ops/summary',headers=self.headers(ops)).json['operations']['modem_24h']
 report=self.envelope(gateway,kind='heartbeat',occurred_at_ms=int((now-timedelta(seconds=150)).timestamp()*1000),transport=transport)
 self.assertEqual(self.client.post('/api/v1/device/events',json=report).status_code,200)
 self.assertEqual(self.client.post('/api/v1/device/events',json=report).status_code,200)
 first=self.client.get('/api/v1/ops/summary',headers=self.headers(ops));self.assertEqual(first.status_code,200,first.json);self.assertEqual(first.json['operations']['modem_24h']['rx_bytes'],baseline['rx_bytes'])
 update={**transport,'rx_bytes':2500,'tx_bytes':700};self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(gateway,kind='heartbeat',occurred_at_ms=int((now-timedelta(seconds=30)).timestamp()*1000),transport=update)).status_code,200)
 result=self.client.get('/api/v1/ops/summary',headers=self.headers(ops));self.assertEqual(result.status_code,200,result.json);metrics=result.json['operations'];self.assertEqual(int(metrics['modem_24h']['rx_bytes']),int(baseline['rx_bytes'] or 0)+1500);self.assertEqual(int(metrics['modem_24h']['tx_bytes']),int(baseline['tx_bytes'] or 0)+400);self.assertEqual(metrics['modem_24h']['measured_sessions'],baseline['measured_sessions']+1)
 modem=next(item for item in metrics['modems'] if item['device_id']==gateway['id']);self.assertTrue(modem['current']);self.assertEqual(modem['signal_dbm'],-75);self.assertGreater(metrics['users']['onboarded'],0)
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(gateway,kind='heartbeat',transport=transport)).status_code,409)
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(house,kind='heartbeat',transport=transport)).status_code,422)
 bad={**transport,'counter_session':uuid.uuid4().hex,'rx_bytes':True};self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(gateway,kind='heartbeat',transport=bad)).status_code,400)
 reset={**transport,'counter_session':uuid.uuid4().hex,'rx_bytes':0,'tx_bytes':0};self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(gateway,kind='heartbeat',transport=reset)).status_code,200)
OperationsIntegration.test_reported_modem_counters_and_aggregate_scope=test_reported_modem_counters_and_aggregate_scope
