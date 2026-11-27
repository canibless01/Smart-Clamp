-- Business values are versioned data. Credentials and permission invariants are not rules.
create table business_rule_versions (
 id uuid primary key default gen_random_uuid(),
 rule_key text not null,
 scope_type text not null check(scope_type in('global','region','organisation','building','device')),
 scope_ref text not null default '',
 version integer not null check(version>0),
 value jsonb not null,
 effective_from timestamptz not null default now(),
 created_by uuid not null references profiles(id),
 created_at timestamptz not null default now(),
 reason text not null check(length(reason) between 10 and 2000),
 restored_from_version integer,
 check((scope_type='global')=(scope_ref='')),
 unique(rule_key,scope_type,scope_ref,version)
);
alter table business_rule_versions enable row level security;
revoke all on business_rule_versions from public,anon,authenticated;
create trigger business_rule_immutable before update or delete on business_rule_versions for each row execute function private.immutable_record();
create index business_rule_resolution on business_rule_versions(rule_key,scope_type,scope_ref,effective_from desc,version desc);
