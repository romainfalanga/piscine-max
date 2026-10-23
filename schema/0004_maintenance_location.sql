ALTER TABLE pools ADD COLUMN location_precision TEXT NOT NULL DEFAULT 'none' CHECK(location_precision IN('none','municipality','address'));
UPDATE pools SET location_precision='municipality' WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
ALTER TABLE pools ADD COLUMN filter_type TEXT NOT NULL DEFAULT 'unknown' CHECK(filter_type IN('unknown','sand','glass','cartridge','other'));
ALTER TABLE pools ADD COLUMN has_steps INTEGER NOT NULL DEFAULT 1 CHECK(has_steps IN(0,1));
ALTER TABLE pools ADD COLUMN has_skimmers INTEGER NOT NULL DEFAULT 1 CHECK(has_skimmers IN(0,1));
ALTER TABLE pools ADD COLUMN has_prefilter INTEGER NOT NULL DEFAULT 1 CHECK(has_prefilter IN(0,1));
ALTER TABLE records ADD COLUMN checklist_version INTEGER NOT NULL DEFAULT 0;
