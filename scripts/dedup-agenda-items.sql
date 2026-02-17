-- Verwijder dubbele agenda_items (houd oudste record per groep)
-- Groepeer op: title, date, time, voor_wie, end_date
-- (description en color negeren we bewust, zodat kleine verschillen niet leiden tot veel duplicaten)

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        title,
        date,
        time,
        voor_wie,
        end_date
      ORDER BY created_at ASC
    ) AS rn
  FROM agenda_items
)
DELETE FROM agenda_items
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

