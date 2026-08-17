insert into cache_professions (id, name) values
  ('tailleur', 'Tailleur'),
  ('bijoutier', 'Bijoutier'),
  ('cordonnier', 'Cordonnier'),
  ('faconneur', 'Façonneur'),
  ('sculpteur', 'Sculpteur'),
  ('forgeron', 'Forgeron')
on conflict (id) do nothing;
