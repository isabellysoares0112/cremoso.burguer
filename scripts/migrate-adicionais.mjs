/**
 * Migration script: creates adicionais_categoria table in Supabase.
 * Run with: node scripts/migrate-adicionais.mjs
 *
 * Uses the SUPABASE_SERVICE_ROLE_KEY to authenticate against the
 * Supabase Management API SQL endpoint.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Extract project ref from URL: https://PROJECTREF.supabase.co
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
console.log('Project ref:', projectRef)

const SQL = `
create table if not exists adicionais_categoria (
  id uuid primary key default gen_random_uuid(),
  categoria_slug text references categorias(slug) on update cascade on delete cascade,
  nome text not null,
  preco numeric(10,2) not null default 0,
  ativo boolean not null default true,
  ordem int default 0,
  created_at timestamptz default now()
);

alter table adicionais_categoria enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'adicionais_categoria'
    and policyname = 'Public read adicionais_categoria'
  ) then
    execute 'create policy "Public read adicionais_categoria" on adicionais_categoria for select using (true)';
  end if;
end $$;
`

async function runViaManagementApi() {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL }),
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, body: text }
}

async function runViaRestRpc() {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: SQL }),
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, body: text }
}

async function verifyTable() {
  const url = `${SUPABASE_URL}/rest/v1/adicionais_categoria?limit=1&select=id`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
  })
  return res.ok
}

async function main() {
  // First check if table already exists
  console.log('\n1. Checking if table already exists...')
  if (await verifyTable()) {
    console.log('✅ Table adicionais_categoria already exists!')
    return
  }

  // Try Management API
  console.log('\n2. Trying Supabase Management API...')
  try {
    const r = await runViaManagementApi()
    console.log('   Status:', r.status, 'Body:', r.body.slice(0, 300))
    if (r.ok) {
      console.log('✅ Table created via Management API!')
      return
    }
  } catch (e) {
    console.log('   Management API error:', e.message)
  }

  // Try RPC exec_sql
  console.log('\n3. Trying RPC exec_sql...')
  try {
    const r = await runViaRestRpc()
    console.log('   Status:', r.status, 'Body:', r.body.slice(0, 300))
    if (r.ok) {
      console.log('✅ Table created via RPC!')
      return
    }
  } catch (e) {
    console.log('   RPC error:', e.message)
  }

  // Verify again (maybe one of them worked)
  if (await verifyTable()) {
    console.log('✅ Table exists after migration attempts!')
    return
  }

  console.log('\n❌ Could not create table automatically.')
  console.log('\nPlease run the following SQL in Supabase → SQL Editor → New Query:\n')
  console.log('─'.repeat(60))
  console.log(SQL.trim())
  console.log('─'.repeat(60))
}

main().catch(console.error)
