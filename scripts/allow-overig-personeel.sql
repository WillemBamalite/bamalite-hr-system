-- Script om "overig" toe te staan als ship_id waarde
-- Dit maakt het mogelijk om personeel toe te wijzen aan "overig personeel" 
-- in plaats van aan een specifiek schip

-- ==============================================
-- 1. CHECK IF FOREIGN KEY CONSTRAINT EXISTS
-- ==============================================
-- Eerst controleren of er een foreign key constraint is op crew.ship_id
-- Als die er is, moeten we deze aanpassen om "overig" toe te staan

-- Check voor bestaande foreign key constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'crew'
    AND kcu.column_name = 'ship_id';

-- ==============================================
-- 2. DROP FOREIGN KEY CONSTRAINT IF EXISTS
-- ==============================================
-- Als er een foreign key constraint is, moeten we deze eerst droppen
-- Vervang 'crew_ship_id_fkey' met de daadwerkelijke constraint naam uit de query hierboven

-- ALTER TABLE crew DROP CONSTRAINT IF EXISTS crew_ship_id_fkey;

-- ==============================================
-- 3. CREATE NEW FOREIGN KEY WITH NULL/OVERIG SUPPORT
-- ==============================================
-- Maak een nieuwe foreign key constraint die NULL en "overig" toestaat
-- Dit is lastig omdat foreign keys alleen verwijzen naar bestaande records
-- Daarom maken we een check constraint in plaats daarvan

-- Option 1: Als ship_id NULL kan zijn, kunnen we de foreign key behouden
-- maar moeten we een check constraint toevoegen voor "overig"

-- Option 2: Als we de foreign key willen behouden, kunnen we een dummy "overig" schip aanmaken
-- Dit is de beste oplossing als we referential integrity willen behouden

-- Maak een dummy "overig" schip aan (als deze nog niet bestaat)
INSERT INTO ships (id, name, max_crew, status, location, route, company)
VALUES ('overig', 'Overig Personeel', 0, 'Operationeel', '', '', 'Bamalite S.A.')
ON CONFLICT (id) DO NOTHING;

-- Nu kunnen we de foreign key constraint behouden omdat "overig" een geldig schip ID is
-- Als er al een foreign key constraint is, hoef je deze niet te droppen

-- ==============================================
-- 4. VERIFY
-- ==============================================
-- Controleer of het "overig" schip bestaat
SELECT * FROM ships WHERE id = 'overig';

-- Controleer of er crew members zijn met ship_id = 'overig'
SELECT id, first_name, last_name, ship_id, status 
FROM crew 
WHERE ship_id = 'overig';

