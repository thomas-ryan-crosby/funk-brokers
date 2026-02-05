-- Additional property verification fields for Get Verified / Elite workflows.
-- Run after 008_properties_extended.sql.

alter table properties add column if not exists estimated_worth numeric(14,2);
alter table properties add column if not exists make_me_move_price numeric(14,2);
alter table properties add column if not exists has_insurance boolean;
alter table properties add column if not exists insurance_approximation numeric(14,2);
alter table properties add column if not exists has_mortgage boolean;
alter table properties add column if not exists remaining_mortgage numeric(14,2);
alter table properties add column if not exists mortgage_doc_url text;
alter table properties add column if not exists payoff_or_lien_release_url text;
alter table properties add column if not exists lien_tax boolean;
alter table properties add column if not exists lien_hoa boolean;
alter table properties add column if not exists lien_mechanic boolean;
alter table properties add column if not exists lien_other_details text;
alter table properties add column if not exists verified_comps jsonb default '[]';
alter table properties add column if not exists video_files jsonb default '[]';
alter table properties add column if not exists floor_plan_url text;
alter table properties add column if not exists valuation_doc_url text;
alter table properties add column if not exists comp_report_url text;
alter table properties add column if not exists matterport_tour_url text;
alter table properties add column if not exists has_insurance_claims boolean;
alter table properties add column if not exists insurance_claims_description text;
alter table properties add column if not exists insurance_claims_report_url text;
alter table properties add column if not exists third_party_review_confirmed boolean;
alter table properties add column if not exists third_party_review_vendor_id text;
alter table properties add column if not exists verified boolean;
alter table properties add column if not exists verified_at timestamptz;
