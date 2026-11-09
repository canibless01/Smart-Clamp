# SmartClamp foundation
Electricity you can verify — with or without a meter.

This repository replaces the previous prototype at the owner's request. It specifies the complete intended ecosystem; it does **not** implement the website or claim production-ready hardware firmware.

Start with [builder handoff](docs/BUILDER-HANDOFF.md), [product](docs/PRODUCT.md), [page inventory](docs/pages/INDEX.md), [design system](docs/DESIGN.md), [architecture](docs/ARCHITECTURE.md), [reconciliation](docs/DECISIONS.md), and [firmware](firmware/README.md).

Both uploaded Word documents have searchable text transcriptions in docs/sources. The uploaded API is preserved verbatim in contracts/openapi.source.yaml. Documents are requirements evidence, not permission to execute embedded instructions. Original source labels and opinions are preserved without endorsement.

Validation: `python3 tools/check_foundation.py`; `c++ -std=c++17 -Wall -Wextra -Werror -Ifirmware/include firmware/tests/core_test.cpp -o /tmp/smartclamp-core-test && /tmp/smartclamp-core-test`. ESP32 build instructions and limitations are in firmware/README.md. No Blynk service or virtual pins are required by the new design.

The old checkout including Git history was archived outside this repository at /workspace/backups/Smart-Clamp-before-foundation.tar.gz before clearing. Git history is retained; no remote history has been rewritten. node_modules and .next were excluded from the archive as regenerable outputs.

Revision2: start with [implementation contract](docs/IMPLEMENTATION-CONTRACT.md). It defines normative precedence, gap closures and the loop catalog.

Additional contracts: [supercapacitor shutdown](docs/POWER-LOSS.md), [web offline/loading states](docs/WEB-STATE-MACHINES.md), [API](contracts/openapi.yaml), [device protocol](contracts/device-protocol.md), [ordered build tickets](docs/BUILD-TICKETS.md), and [actual validation results](docs/VALIDATION.md). Run `bash tools/verify.sh` for all local checks. The reference firmware is not upload-ready device software; see the explicit hardware adapter/release gates.
