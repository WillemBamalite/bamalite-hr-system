-- Enable Row Level Security on all tables
ALTER TABLE ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE sick_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE stand_back_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON ships;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON ships;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON ships;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON ships;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON crew;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON crew;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON crew;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON crew;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON sick_leave;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON sick_leave;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON sick_leave;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON sick_leave;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON stand_back_days;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON stand_back_days;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON stand_back_days;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON stand_back_days;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON loans;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON loans;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON loans;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON loans;

-- Create policies for ships table
CREATE POLICY "Enable read access for authenticated users" ON ships
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON ships
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON ships
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON ships
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for crew table
CREATE POLICY "Enable read access for authenticated users" ON crew
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON crew
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON crew
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON crew
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for sick_leave table
CREATE POLICY "Enable read access for authenticated users" ON sick_leave
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON sick_leave
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON sick_leave
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON sick_leave
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for stand_back_days table
CREATE POLICY "Enable read access for authenticated users" ON stand_back_days
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON stand_back_days
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON stand_back_days
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON stand_back_days
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for loans table
CREATE POLICY "Enable read access for authenticated users" ON loans
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON loans
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON loans
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON loans
    FOR DELETE USING (auth.role() = 'authenticated');

