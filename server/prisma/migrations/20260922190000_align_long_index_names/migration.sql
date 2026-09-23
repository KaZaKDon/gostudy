-- PostgreSQL limits identifiers to 63 bytes. Two historical migrations used
-- longer index names, so PostgreSQL truncated them while Prisma generated
-- different 63-byte names for the same indexes.
--
-- The migration supports both expected starting states:
--   * a clean database has the PostgreSQL-truncated historical name;
--   * an existing reconciled database already has the Prisma name.
-- Unexpected states fail explicitly instead of hiding schema damage.

DO $migration$
DECLARE
    schema_name TEXT := current_schema();
    index_pair RECORD;
    old_exists BOOLEAN;
    target_exists BOOLEAN;
BEGIN
    FOR index_pair IN
        SELECT *
        FROM (
            VALUES
                (
                    'accessibility application',
                    'accessibility_applications_submitted_by_id_status_created_at_id',
                    'accessibility_applications_submitted_by_id_status_created_a_idx'
                ),
                (
                    'learning material',
                    'learning_materials_publication_status_category_subject_id_publi',
                    'learning_materials_publication_status_category_subject_id_p_idx'
                )
        ) AS expected_indexes(context, old_name, target_name)
    LOOP
        SELECT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_class AS index_class
            INNER JOIN pg_catalog.pg_namespace AS namespace
                ON namespace.oid = index_class.relnamespace
            WHERE namespace.nspname = schema_name
              AND index_class.relname = index_pair.old_name
              AND index_class.relkind = 'i'
        ) INTO old_exists;

        SELECT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_class AS index_class
            INNER JOIN pg_catalog.pg_namespace AS namespace
                ON namespace.oid = index_class.relnamespace
            WHERE namespace.nspname = schema_name
              AND index_class.relname = index_pair.target_name
              AND index_class.relkind = 'i'
        ) INTO target_exists;

        IF old_exists AND target_exists THEN
            RAISE EXCEPTION
                'Cannot align % index: both % and % exist in schema %',
                index_pair.context,
                index_pair.old_name,
                index_pair.target_name,
                schema_name;
        ELSIF old_exists THEN
            EXECUTE format(
                'ALTER INDEX %I.%I RENAME TO %I',
                schema_name,
                index_pair.old_name,
                index_pair.target_name
            );
        ELSIF NOT target_exists THEN
            RAISE EXCEPTION
                'Cannot align % index: neither % nor % exists in schema %',
                index_pair.context,
                index_pair.old_name,
                index_pair.target_name,
                schema_name;
        END IF;
    END LOOP;
END
$migration$;
