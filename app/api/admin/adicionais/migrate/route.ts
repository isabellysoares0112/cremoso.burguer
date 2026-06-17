import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SQL_CREATE = `
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

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey': key,
      },
      body: JSON.stringify({ sql: SQL_CREATE }),
    })

    if (res.ok) {
      return NextResponse.json({ ok: true, method: 'rpc' })
    }
  } catch {
    // fallthrough to verify
  }

  const { error } = await supabaseAdmin
    .from('adicionais_categoria')
    .select('id')
    .limit(1)

  if (!error) {
    return NextResponse.json({ ok: true, method: 'already_exists' })
  }

  return NextResponse.json({
    ok: false,
    sql: SQL_CREATE.trim(),
    instructions: 'Execute o SQL acima no Supabase → SQL Editor',
    error: error.message,
  }, { status: 422 })
}
