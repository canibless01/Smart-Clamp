"""Sampled supply hours must not turn missing data into outage or zero supply."""
from datetime import datetime,timezone,timedelta
from test_api import LiveIntegration
class SupplyHistoryIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(SupplyHistoryIntegration,name,None)
del LiveIntegration

def test_sampled_hours_gaps_and_authority(self):
 owner=self.user('homeowner');other=self.user('homeowner');d=self.provision(owner);now=datetime.now(timezone.utc);base='/api/v1/devices/'+d['id']+'/supply-history'
 result=self.client.get(base,headers=self.headers(owner));self.assertEqual(result.status_code,200,result.json);self.assertIsNone(result.json['current']['present_seconds']);self.assertIsNone(result.json['current']['absent_seconds']);self.assertEqual(result.json['current']['coverage'],0)
 # 2 present minutes, a transition (unknown), 1 absent minute, then a long gap (unknown).
 for seconds,voltage,clock in [(-600,230000,'trusted'),(-540,230000,'trusted'),(-480,230000,'trusted'),(-420,0,'trusted'),(-360,0,'trusted'),(-60,0,'trusted'),(-30,230000,'estimated')]:
  response=self.client.post('/api/v1/device/events',json=self.envelope(d,occurred_at_ms=int((now+timedelta(seconds=seconds)).timestamp()*1000),clock_quality=clock,metrics={'voltage_mv':voltage}));self.assertEqual(response.status_code,200,response.json)
 result=self.client.get(base+'?days=1',headers=self.headers(owner));self.assertEqual(result.status_code,200,result.json);current=result.json['current'];self.assertEqual(current['present_seconds'],120);self.assertEqual(current['absent_seconds'],60);self.assertEqual(current['unknown_seconds'],86400-180);self.assertEqual(current['observations'],7)
 self.assertEqual(result.json['previous']['coverage'],0);self.assertIsNone(result.json['previous']['present_seconds'])
 self.assertEqual(self.client.get(base,headers=self.headers(other)).status_code,404)
 self.assertEqual(self.client.get(base+'?days=365',headers=self.headers(owner)).status_code,400)
SupplyHistoryIntegration.test_sampled_hours_gaps_and_authority=test_sampled_hours_gaps_and_authority
