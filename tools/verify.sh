#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/check_foundation.py
python3 -m unittest discover -s contracts/tests -v
python3 - <<'PY'
from pathlib import Path
import json,yaml
from openapi_spec_validator import validate_spec
spec=yaml.safe_load(Path('contracts/openapi.yaml').read_text())
validate_spec(spec)
operations=[o for methods in spec['paths'].values() for method,o in methods.items() if method in ('get','post','put','patch','delete')]
assert len({o['operationId'] for o in operations})==len(operations)
routes=json.loads(Path('contracts/routes.json').read_text())
assert len(routes)==48 and len({r['route'] for r in routes})==48
for r in routes:assert Path(r['spec']).is_file(),r
print(f'OpenAPI valid: {len(operations)} operations; 48 unique documented routes.')
PY
verify_dir=$(mktemp -d /tmp/smartclamp-verify.XXXXXX)
trap 'rm -rf "$verify_dir"' EXIT
for suite in core runtime; do
  c++ -std=c++17 -Wall -Wextra -Werror -Ifirmware/include "firmware/tests/${suite}_test.cpp" -o "$verify_dir/$suite"
  "$verify_dir/$suite"
done
c++ -std=c++17 -Wall -Wextra -Werror -Ifirmware/include firmware/tests/crypto_test.cpp -lcrypto -o "$verify_dir/crypto"
"$verify_dir/crypto"
