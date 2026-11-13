-- Provider acceptance never proves handset delivery. Unknown dispatches are not resent.
ALTER TABLE notifications ADD COLUMN dispatched_at timestamptz;
ALTER TABLE notifications ADD COLUMN last_error text;
