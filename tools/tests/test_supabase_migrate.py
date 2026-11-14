"""Actual local PostgreSQL bundle replay; no external Supabase mutation."""
import hashlib,json,os,pathlib,sys,unittest,uuid
import psycopg
from psycopg import sql
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from supabase_migrate import bundle,migrations,inspect,Management

class BundleIntegration(unittest.TestCase):
    def setUp(self):
        config=os.environ.get('SMARTCLAMP_QA_CONFIG')
        if not config:self.skipTest('Requires isolated PostgreSQL QA config')
        self.q=json.loads(pathlib.Path(config).read_text())
        if not self.q['name'].startswith('smartclamp-qa-'):raise RuntimeError('Refusing non-QA configuration')
        self.name='qa_migrations_'+uuid.uuid4().hex[:16]
        self.connection={'host':'127.0.0.1','port':self.q['port'],'user':'postgres','password':self.q['password']}
        with psycopg.connect(**self.connection,dbname='postgres',autocommit=True) as admin:admin.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(self.name)))
        self.db=psycopg.connect(**self.connection,dbname=self.name,autocommit=True)
        self.db.execute("CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$",prepare=False)
    def tearDown(self):
        if hasattr(self,'db'):
            self.db.close()
            with psycopg.connect(**self.connection,dbname='postgres',autocommit=True) as admin:admin.execute(sql.SQL('DROP DATABASE {} WITH (FORCE)').format(sql.Identifier(self.name)))
    def test_all_migrations_apply_and_replay_then_reject_checksum_drift(self):
        source=bundle('fmjzskjkvdbffwkiujnu');self.db.execute(source,prepare=False)
        expected={item['name']:item['sha256'] for item in migrations()}
        self.assertEqual(dict(self.db.execute('SELECT name,sha256 FROM schema_migrations').fetchall()),expected)
        self.db.execute(source,prepare=False)
        self.assertEqual(self.db.execute('SELECT count(*) FROM schema_migrations').fetchone()[0],len(expected))
        self.db.execute('UPDATE schema_migrations SET sha256=%s WHERE name=%s',('0'*64,sorted(expected)[0]))
        with self.assertRaises(psycopg.Error):self.db.execute(source,prepare=False)
        self.db.execute('ROLLBACK')
        self.assertEqual(self.db.execute('SELECT count(*) FROM schema_migrations').fetchone()[0],len(expected))
    def test_untracked_public_data_is_preserved_and_refused(self):
        self.db.execute("CREATE TABLE public.existing_app(data text); INSERT INTO public.existing_app VALUES('preserve this')")
        with self.assertRaises(psycopg.Error):self.db.execute(bundle('fmjzskjkvdbffwkiujnu'),prepare=False)
        self.db.execute('ROLLBACK')
        self.assertEqual(self.db.execute('SELECT data FROM public.existing_app').fetchone()[0],'preserve this')
        self.assertIsNone(self.db.execute("SELECT to_regclass('public.schema_migrations')").fetchone()[0])

class TargetChecks(unittest.TestCase):
    def test_explicit_project_and_credential_are_required(self):
        for bad in ('','other','https://supabase.com','a'*20+'/../other'):
            with self.assertRaises(RuntimeError):bundle(bad)
        with self.assertRaises(RuntimeError):Management('fmjzskjkvdbffwkiujnu',None)
    def test_remote_unknown_history_is_rejected_before_apply(self):
        class Remote:
            def sql(self,source):return [{'tracked':True}] if 'to_regclass' in source else [{'name':'foreign.sql','sha256':'0'*64}]
        with self.assertRaises(RuntimeError):inspect(Remote(),migrations())

if __name__=='__main__':unittest.main()
