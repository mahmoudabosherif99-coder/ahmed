-- شغّل هذا الملف مرة واحدة من Supabase Dashboard -> SQL Editor
alter table public.sales
  add column if not exists invoice_no text,
  add column if not exists invoice_date date;

alter table public.purchases
  add column if not exists invoice_no text,
  add column if not exists invoice_date date;

-- الفواتير القديمة تأخذ تاريخ العملية ورقمًا تلقائيًا
update public.sales
set invoice_date = coalesce(invoice_date, sale_date::date),
    invoice_no = coalesce(invoice_no, 'SALE-' || left(id::text, 8))
where invoice_date is null or invoice_no is null;

update public.purchases
set invoice_date = coalesce(invoice_date, purchase_date::date),
    invoice_no = coalesce(invoice_no, 'PUR-' || left(id::text, 8))
where invoice_date is null or invoice_no is null;

create index if not exists sales_invoice_no_idx on public.sales(invoice_no);
create index if not exists purchases_invoice_no_idx on public.purchases(invoice_no);
