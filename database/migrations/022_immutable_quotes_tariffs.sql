-- A paid purchase must continue to describe the exact approved quote/rate version.
CREATE TRIGGER immutable_quote BEFORE UPDATE OR DELETE ON quotes
 FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
CREATE TRIGGER immutable_tariff_version BEFORE UPDATE OR DELETE ON tariffs
 FOR EACH ROW EXECUTE FUNCTION private.immutable_record();
