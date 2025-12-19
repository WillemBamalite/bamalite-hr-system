-- Add status and taken_by fields to tasks table
-- This allows tracking if a task is open, in progress, or completed
-- and who is working on it

-- Add status column (default 'open')
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed'));

-- Add taken_by column (who picked up the task)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS taken_by TEXT;

-- Add taken_at timestamp (when the task was picked up)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS taken_at TIMESTAMP WITH TIME ZONE;

-- Update existing completed tasks to have status 'completed'
UPDATE tasks 
SET status = 'completed' 
WHERE completed = true AND (status IS NULL OR status = 'open');

-- Add comments for documentation
COMMENT ON COLUMN tasks.status IS 'Task status: open, in_progress, or completed';
COMMENT ON COLUMN tasks.taken_by IS 'Email or name of person who picked up the task';
COMMENT ON COLUMN tasks.taken_at IS 'Timestamp when the task was picked up';

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_taken_by ON tasks(taken_by) WHERE taken_by IS NOT NULL;



