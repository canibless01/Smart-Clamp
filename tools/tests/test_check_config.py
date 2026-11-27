"""Readiness profiles must not confuse signing in with paid/hardware activation."""
import importlib.util,pathlib,unittest
spec=importlib.util.spec_from_file_location('check_config',pathlib.Path(__file__).resolve().parents[1]/'check_config.py');config=importlib.util.module_from_spec(spec);spec.loader.exec_module(config)
class AuthConfiguration(unittest.TestCase):
 def values(self):return {'DATABASE_URL':'postgresql://backend:fixture@db.example/smartclamp','SUPABASE_URL':'https://fmjzskjkvdbffwkiujnu.supabase.co','SUPABASE_ANON_KEY':'fixture-public-key','APP_ORIGIN':'https://smartclamp.example','LEGAL_TERMS_VERSION':'approved-v1','LEGAL_PRIVACY_VERSION':'approved-v1'}
 def test_auth_profile_checks_only_required_identity_inputs(self):
  self.assertEqual(config.validate(self.values(),'auth'),([],[]))
  missing,invalid=config.validate({**self.values(),'EMAIL_ENABLED':'true','OTA_ENABLED':'true'},'auth');self.assertEqual((missing,invalid),([],[]))
  missing,_=config.validate(self.values());self.assertIn('DEVICE_HMAC_ENCRYPTION_KEY',missing);self.assertIn('PAYSTACK_SECRET_KEY',missing);self.assertIn('REPORT_SIGNING_KEY_FILE',missing)
 def test_auth_still_rejects_missing_origin_and_preview_legal_versions(self):
  values=self.values();values.pop('APP_ORIGIN');missing,_=config.validate(values,'auth');self.assertIn('APP_ORIGIN',missing)
  _,invalid=config.validate({**self.values(),'LEGAL_TERMS_VERSION':'preview-v1'},'auth');self.assertTrue(any('LEGAL_TERMS_VERSION' in issue for issue in invalid))
 def test_invalid_urls_fail_without_echoing_the_credential(self):
  _,invalid=config.validate({**self.values(),'SUPABASE_URL':'https://private-fixture:fixture-password@db.example'},'auth');self.assertTrue(invalid);self.assertNotIn('fixture-password',str(invalid))
