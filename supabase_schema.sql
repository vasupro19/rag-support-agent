-- Enable the pgvector extension to support vector similarity search
create extension if not exists vector;

-- Create the company_policies table
create table if not exists company_policies (
  id bigint generated always as identity primary key,
  content text not null,
  embedding vector(768) not null
);

-- Enable Row Level Security (RLS) on company_policies
alter table company_policies enable row level security;

-- Create a policy allowing public read access to company_policies
create policy "Allow read access to all users" on company_policies
  for select using (true);

create policy "Allow insert/update/delete for service role" on company_policies
  for all using (true) with check (true);

-- Create the match_policies Postgres function for cosine similarity searches
create or replace function match_policies (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language plpgsql stable
as $$
begin
  return query
  select
    company_policies.id,
    company_policies.content,
    1 - (company_policies.embedding <=> query_embedding) as similarity
  from company_policies
  where 1 - (company_policies.embedding <=> query_embedding) > match_threshold
  order by company_policies.embedding <=> query_embedding asc
  limit match_count;
end;
$$;

-- Create a mock orders table
create table if not exists orders (
  id text primary key,
  status text not null,
  days_delayed integer not null default 0
);

-- Enable RLS on orders table
alter table orders enable row level security;

-- Create a policy for access (since we are using the service role key, it bypasses RLS, but this is good practice)
create policy "Allow read/write access to service role" on orders
  using (true)
  with check (true);

-- Seed mock orders for testing the support agent
insert into orders (id, status, days_delayed) values
  ('ORD-1001', 'delivered', 0),
  ('ORD-1002', 'delayed', 7),
  ('ORD-1003', 'shipped', 1),
  ('ORD-1004', 'delayed', 2),
  ('ORD-1005', 'processing', 0)
on conflict (id) do update set
  status = excluded.status,
  days_delayed = excluded.days_delayed;
