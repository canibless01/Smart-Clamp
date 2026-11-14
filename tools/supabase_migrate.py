"""Targeted Supabase Management API migration; credentials are never printed.

Generate a reviewable SQL bundle without credentials, or check/apply against an
explicit project ref using SUPABASE_ACCESS_TOKEN from secure environment settings.
SQL execution is one transaction. On an uncertain HTTP result only inspect state;
never automatically repeat a mutation.
"""
import argparse,hashlib,json,os,pathlib,re,sys
from datetime import datetime,timezone
import requests

ROOT=pathlib.Path(__file__).resolve().parents[1]
PUBLIC_TABLES="""SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN('r','p') AND c.relname<>'schema_migrations'
AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.objid=c.oid AND d.classid='pg_class'::regclass AND d.deptype='e') ORDER BY c.relname"""

def migrations():
    result=[]
    for path in sorted((ROOT/'database/migrations').glob('*.sql')):
        if not re.fullmatch(r'\d{3}_[a-z0-9_]+\.sql',path.name):raise RuntimeError('Unexpected migration filename')
        raw=path.read_bytes();result.append({'name':path.name,'sha256':hashlib.sha256(raw).hexdigest(),'source':raw.decode()})
    if not result:raise RuntimeError('No migrations found')
    return result

def literal(value):return "'"+value.replace("'","''")+"'"

def bundle(project_ref,items=None):
    if not re.fullmatch('[a-z]{20}',project_ref):raise RuntimeError('An explicit 20-character project ref is required')
    items=migrations() if items is None else items
    allowed=','.join(literal(item['name']) for item in items)
    sql=[f'-- SmartClamp target project: {project_ref}\n-- Execute only in this project. Exact migration checksums are tracked below.\nBEGIN;',
         "SELECT pg_advisory_xact_lock(hashtext('smartclamp-migrate'));",
         "DO $sc_empty$ BEGIN IF to_regclass('public.schema_migrations') IS NULL AND EXISTS("+PUBLIC_TABLES+") THEN RAISE EXCEPTION 'Untracked public tables exist; inspect before applying SmartClamp'; END IF; END $sc_empty$;",
         'CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());',
         'DO $sc_known$ BEGIN IF EXISTS(SELECT 1 FROM public.schema_migrations WHERE name NOT IN('+allowed+")) THEN RAISE EXCEPTION 'Unknown migration history; review the target or checkout'; END IF; END $sc_known$;"]
    for index,item in enumerate(items):
        source=item['source'];tag='$sc_source_'+item['sha256']+'$';outer='$sc_step_'+str(index)+'$'
        if tag in source or outer in source:raise RuntimeError('Migration delimiter collision')
        name=literal(item['name']);digest=literal(item['sha256'])
        sql.append(f"""DO {outer}
DECLARE seen text;
BEGIN
  SELECT sha256 INTO seen FROM public.schema_migrations WHERE name={name};
  IF FOUND THEN
    IF seen IS DISTINCT FROM {digest} THEN RAISE EXCEPTION 'Migration checksum mismatch: {item['name']}'; END IF;
  ELSE
    EXECUTE {tag}
{source}
{tag};
    INSERT INTO public.schema_migrations(name,sha256) VALUES({name},{digest});
  END IF;
END {outer};""")
    sql.append('COMMIT;')
    return '\n\n'.join(sql)+'\n'

class Management:
    def __init__(self,project_ref,token):
        if not re.fullmatch('[a-z]{20}',project_ref):raise RuntimeError('Invalid target project ref')
        if not token:raise RuntimeError('SUPABASE_ACCESS_TOKEN is missing; supply it through secure environment settings, never chat')
        self.ref=project_ref;self.http=requests.Session();self.http.headers.update({'Authorization':'Bearer '+token})
        self.base='https://api.supabase.com/v1/projects/'+project_ref
    def call(self,path='',query=None,read_only=True):
        try:
            response=self.http.get(self.base,timeout=(10,45),allow_redirects=False) if query is None else self.http.post(self.base+path,json={'query':query,'read_only':read_only},timeout=(10,45),allow_redirects=False)
        except requests.RequestException:raise RuntimeError('Management API transport failed; mutation outcome may be uncertain. Check state before any reapply') from None
        if not response.ok:raise RuntimeError('Management API rejected the request (HTTP '+str(response.status_code)+'); no response body or credentials were logged')
        try:return response.json()
        except ValueError:raise RuntimeError('Unexpected Management API response; verify migration state before retrying') from None
    def identify(self):
        result=self.call()
        if not isinstance(result,dict) or (result.get('ref') or result.get('id'))!=self.ref:raise RuntimeError('Returned project identity does not match the explicit target')
        if result.get('status')!='ACTIVE_HEALTHY':raise RuntimeError('Target project is not ACTIVE_HEALTHY; wait for platform readiness')
    def sql(self,source,read_only=True):return self.call('/database/query',source,read_only)

def checked_rows(result):
    if not isinstance(result,list) or any(not isinstance(row,dict) for row in result):raise RuntimeError('Unexpected SQL response shape')
    return result

def inspect(remote,items):
    found=checked_rows(remote.sql("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS tracked"))
    tracked=bool(found and found[0].get('tracked'))
    state=checked_rows(remote.sql('SELECT name,sha256 FROM public.schema_migrations ORDER BY name')) if tracked else []
    if not tracked and checked_rows(remote.sql(PUBLIC_TABLES)):raise RuntimeError('Target has untracked public tables; inspect before applying')
    applied={row['name']:row['sha256'] for row in state};expected={item['name']:item['sha256'] for item in items}
    if set(applied)-set(expected):raise RuntimeError('Target contains migration names outside this checkout')
    if any(expected[name]!=digest for name,digest in applied.items()):raise RuntimeError('An applied migration checksum differs; do not modify migration history')
    return applied

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--project-ref',required=True)
    action=parser.add_mutually_exclusive_group();action.add_argument('--apply',action='store_true');action.add_argument('--check',action='store_true')
    parser.add_argument('--output-sql',type=pathlib.Path);parser.add_argument('--receipt',type=pathlib.Path)
    args=parser.parse_args();items=migrations();sql=bundle(args.project_ref,items)
    if args.output_sql:
        args.output_sql.parent.mkdir(parents=True,exist_ok=True);args.output_sql.write_text(sql);print('Generated checksum-tracked SQL bundle:',args.output_sql)
    if not args.apply and not args.check:
        if not args.output_sql:parser.error('Choose --check, --apply or --output-sql')
        return
    remote=Management(args.project_ref,os.environ.get('SUPABASE_ACCESS_TOKEN'));remote.identify();before=inspect(remote,items)
    pending=[item['name'] for item in items if item['name'] not in before]
    print('Verified explicit project:',args.project_ref,'Applied:',len(before),'Pending:',len(pending))
    if args.apply and pending:
        remote.sql(sql,read_only=False)
        after=inspect(remote,items)
        if len(after)!=len(items):raise RuntimeError('Post-apply verification is incomplete; check target state before any retry')
    else:after=before
    if args.receipt:
        args.receipt.parent.mkdir(parents=True,exist_ok=True)
        args.receipt.write_text(json.dumps({'project_ref':args.project_ref,'checked_at':datetime.now(timezone.utc).isoformat(),'status':'schema_current' if len(after)==len(items) else 'pending','applied':after,'pending':[i['name'] for i in items if i['name'] not in after]},indent=2)+'\n')
    print('Verified migration state:',len(after),'of',len(items),'(schema only; providers, worker, Auth configuration and hardware are separate)')

if __name__=='__main__':
    try:main()
    except RuntimeError as error:print('Migration stopped:',error,file=sys.stderr);sys.exit(1)
