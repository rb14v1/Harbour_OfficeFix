# Accepted-Risk CVEs

This file lists CRITICAL or HIGH severity CVEs in our dependencies that have
**no fixed version available yet**. We accept these risks for now, and each
entry needs a justification and a review date. A CVE that has a fixed release
must be fixed by upgrading the dependency. It must not be listed here.

## Dependency policy

- `backend/requirements.txt` sets a floor for Django at a patched 5.2 LTS
  release (`Django>=5.2.13,<5.3`). This covers CVE-2025-13372, CVE-2026-1207,
  CVE-2026-1287, CVE-2026-3902 and earlier advisories. The build therefore
  installs the newest 5.2.x security release.
- `djangorestframework` is limited to `>=3.16.1,<4.0`, so the build installs
  the newest patched 3.x release.
- Check this file at every dependency scan and at least once every quarter.

## Accepted risks

| CVE | Package | Installed version | Severity | Justification | Owner | Review date |
|-----|---------|-------------------|----------|---------------|-------|-------------|
| _None_ | - | - | - | No known CRITICAL/HIGH CVEs without a fix are currently present. | Backend team | 2027-02-20 |

## How to add an entry

1. Confirm that no fixed upstream version exists. Check the vendor advisory
   and the OSV/GHSA databases.
2. Write down what reduces the risk, such as a code path that is not used, a
   feature that is turned off, or a WAF rule.
3. Set a review date no more than 90 days away.
4. When a fix is released, remove the entry and upgrade the pin.
