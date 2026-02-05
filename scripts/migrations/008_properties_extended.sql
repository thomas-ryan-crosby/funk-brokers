-- Extended property fields (list property / get verified workflow). Run after 007.

alter table properties add column if not exists description text;
alter table properties add column if not exists lot_size numeric(14,2);
alter table properties add column if not exists year_built integer;
alter table properties add column if not exists hoa_fee numeric(14,2);
alter table properties add column if not exists property_tax numeric(14,2);
alter table properties add column if not exists im_gone_price numeric(14,2);
alter table properties add column if not exists has_hoa boolean;
alter table properties add column if not exists deed_url text;
alter table properties add column if not exists property_tax_record_url text;
alter table properties add column if not exists hoa_docs_url text;
alter table properties add column if not exists disclosure_forms_url text;
alter table properties add column if not exists inspection_report_url text;
alter table properties add column if not exists seller_name text;
alter table properties add column if not exists seller_email text;
alter table properties add column if not exists professional_photos boolean;
