-- Cremoso Burguer Schema
-- Run this in Supabase → SQL Editor → New Query

create extension if not exists "pgcrypto";

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image text,
  category_slug text references categorias(slug) on update cascade,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  neighborhood text,
  created_at timestamptz default now()
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  number bigserial unique,
  customer jsonb not null,
  items jsonb not null,
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text not null,
  status text not null default 'novo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Adicionais por categoria (shared across all products in that category)
-- Note: 'bebidas' category does NOT support adicionais (enforced in application layer)
create table if not exists adicionais_categoria (
  id uuid primary key default gen_random_uuid(),
  categoria_slug text references categorias(slug) on update cascade on delete cascade,
  nome text not null,
  preco numeric(10,2) not null default 0,
  ativo boolean not null default true,
  ordem int default 0,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table categorias enable row level security;
alter table produtos enable row level security;
alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table adicionais_categoria enable row level security;

-- Public read access for menu data
drop policy if exists "Public read categorias" on categorias;
create policy "Public read categorias" on categorias for select using (true);

drop policy if exists "Public read produtos" on produtos;
create policy "Public read produtos" on produtos for select using (true);

drop policy if exists "Public read adicionais_categoria" on adicionais_categoria;
create policy "Public read adicionais_categoria" on adicionais_categoria for select using (true);

-- Anyone can create an order (the public website checkout)
drop policy if exists "Public insert pedidos" on pedidos;
create policy "Public insert pedidos" on pedidos for insert with check (true);

drop policy if exists "Public insert clientes" on clientes;
create policy "Public insert clientes" on clientes for insert with check (true);

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read produtos bucket" on storage.objects;
create policy "Public read produtos bucket" on storage.objects
  for select using (bucket_id = 'produtos');

drop policy if exists "Public upload produtos bucket" on storage.objects;
create policy "Public upload produtos bucket" on storage.objects
  for insert with check (bucket_id = 'produtos');

drop policy if exists "Public update produtos bucket" on storage.objects;
create policy "Public update produtos bucket" on storage.objects
  for update using (bucket_id = 'produtos');

drop policy if exists "Public delete produtos bucket" on storage.objects;
create policy "Public delete produtos bucket" on storage.objects
  for delete using (bucket_id = 'produtos');

-- Settings / configuracoes (single-row table — enforced by singleton_key unique constraint)
create table if not exists configuracoes (
  id                   uuid primary key default gen_random_uuid(),
  singleton_key        integer not null default 1,
  nome_loja            text default 'Cremoso Burguer',
  telefone             text default '',
  whatsapp             text default '',
  instagram            text default '',
  horario_funcionamento text default '',
  taxa_padrao          numeric(10,2) default 5,
  dias_semana          text default '["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"]',
  status_mode          text default 'automatic',
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

alter table configuracoes add column if not exists singleton_key integer not null default 1;
alter table configuracoes drop constraint if exists configuracoes_singleton;
alter table configuracoes add constraint configuracoes_singleton unique (singleton_key);

alter table configuracoes add column if not exists horario_funcionamento text default '';
alter table configuracoes add column if not exists taxa_padrao numeric(10,2) default 5;
alter table configuracoes add column if not exists dias_semana text default '["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"]';
alter table configuracoes add column if not exists status_mode text default 'automatic';
alter table configuracoes add column if not exists instagram text default '';
alter table configuracoes add column if not exists nome_loja text default '';

-- Seed categories
insert into categorias (slug, name, sort_order) values
  ('hamburgueres', 'Hambúrgueres', 1),
  ('combos', 'Combos', 2),
  ('acompanhamentos', 'Acompanhamentos', 3),
  ('bebidas', 'Bebidas', 4)
on conflict (slug) do nothing;
