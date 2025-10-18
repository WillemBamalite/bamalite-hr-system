-- Create vaste_dienst_records table for tracking monthly work days
-- This table tracks how many days relief crew members work each month
-- and maintains a running balance of surplus/deficit days

CREATE TABLE IF NOT EXISTS vaste_dienst_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aflosser_id TEXT REFERENCES crew(id) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  required_days INTEGER DEFAULT 15,
  actual_days DECIMAL(4,1) DEFAULT 0,
  balance_days DECIMAL(4,1) DEFAULT 0, -- Running balance (can be negative)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per aflosser per month
  UNIQUE(aflosser_id, year, month)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vaste_dienst_aflosser_id ON vaste_dienst_records(aflosser_id);
CREATE INDEX IF NOT EXISTS idx_vaste_dienst_year_month ON vaste_dienst_records(year, month);
CREATE INDEX IF NOT EXISTS idx_vaste_dienst_balance ON vaste_dienst_records(balance_days);

-- Add comments for documentation
COMMENT ON TABLE vaste_dienst_records IS 'Tracks monthly work days for relief crew members in fixed service';
COMMENT ON COLUMN vaste_dienst_records.required_days IS 'Required days per month (usually 15)';
COMMENT ON COLUMN vaste_dienst_records.actual_days IS 'Actual days worked this month';
COMMENT ON COLUMN vaste_dienst_records.balance_days IS 'Running balance of surplus/deficit days';
