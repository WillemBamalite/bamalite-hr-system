-- Create loans table for tracking crew education loans
CREATE TABLE IF NOT EXISTS loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    crew_id UUID NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    period TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'voltooid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_loans_crew_id ON loans(crew_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_loans_updated_at 
    BEFORE UPDATE ON loans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add some sample data (optional)
-- INSERT INTO loans (crew_id, name, period, amount, reason, status) VALUES
-- ('sample-crew-id', 'VHF Marifoon Cursus', 'Januari 2025', 250.00, 'Verplichte cursus voor veiligheid aan boord', 'open'),
-- ('sample-crew-id', 'ADN Certificaat', 'Februari 2025', 500.00, 'Certificaat voor gevaarlijke stoffen transport', 'open'); 