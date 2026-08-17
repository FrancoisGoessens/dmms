alter table cache_craftable_items add column if not exists characteristics jsonb;
alter table cache_craftable_items add column if not exists image_url text;
