-- Add customizable scoring settings per league

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS scoring_settings JSONB;

ALTER TABLE leagues
  ALTER COLUMN scoring_settings
  SET DEFAULT '{
    "passing":{"yards_per_point":25,"touchdown":4,"interception":-2},
    "rushing":{"yards_per_point":10,"touchdown":6},
    "receiving":{"yards_per_point":10,"touchdown":6,"reception":1},
    "fumbles":{"lost":-2},
    "kicking":{"field_goal":3,"extra_point":1},
    "defense":{"touchdown":6,"sack":1,"interception":2,"fumble_recovery":2,"safety":2}
  }'::jsonb;

UPDATE leagues
SET scoring_settings = jsonb_build_object(
  'passing', jsonb_build_object('yards_per_point', 25, 'touchdown', 4, 'interception', -2),
  'rushing', jsonb_build_object('yards_per_point', 10, 'touchdown', 6),
  'receiving', jsonb_build_object(
    'yards_per_point', 10,
    'touchdown', 6,
    'reception', CASE scoring_format WHEN 'PPR' THEN 1 WHEN 'HALF_PPR' THEN 0.5 ELSE 0 END
  ),
  'fumbles', jsonb_build_object('lost', -2),
  'kicking', jsonb_build_object('field_goal', 3, 'extra_point', 1),
  'defense', jsonb_build_object('touchdown', 6, 'sack', 1, 'interception', 2, 'fumble_recovery', 2, 'safety', 2)
)
WHERE scoring_settings IS NULL;
