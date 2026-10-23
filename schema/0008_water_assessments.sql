-- Qualitative observations are distinct from measured concentrations. Preserve
-- all historical numeric values; never translate categories into fake readings.
ALTER TABLE records ADD COLUMN assessments TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(assessments) AND json_type(assessments)='object');
