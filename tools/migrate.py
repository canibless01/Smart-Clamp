"""Apply repository SQL once with checksum tracking; DATABASE_URL is never logged."""
import hashlib,os,pathlib,sys
import psycopg

def migrate(url):
    root=pathlib.Path(__file__).resolve().parents[1]
    with psycopg.connect(url.replace('postgresql+psycopg://','postgresql://')) as conn:
        conn.execute("SELECT pg_advisory_xact_lock(hashtext('smartclamp-migrate'))")
        conn.execute('CREATE TABLE IF NOT EXISTS public.schema_migrations(name text primary key,sha256 text not null,applied_at timestamptz not null default now())')
        for path in sorted((root/'database/migrations').glob('*.sql')):
            source=path.read_text();digest=hashlib.sha256(source.encode()).hexdigest()
            found=conn.execute('SELECT sha256 FROM public.schema_migrations WHERE name=%s',(path.name,)).fetchone()
            if found:
                if found[0]!=digest:raise RuntimeError(f'Migration checksum differs: {path.name}; review before changing an already deployed baseline.')
                continue
            conn.execute(source,prepare=False)
            conn.execute('INSERT INTO public.schema_migrations(name,sha256) VALUES(%s,%s)',(path.name,digest))
            print('Applied',path.name)
if __name__=='__main__':migrate(os.environ['DATABASE_URL'])
