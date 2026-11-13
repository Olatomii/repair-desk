# Interface redesign — 13 November 2026

Repair Desk uses a graphite, warm-white and cobalt palette. A four-part repair-joint mark replaces the initial badge, with a matching browser icon. DM Sans is self-hosted through Next font optimization. The landing illustration describes a process rather than implying real customer activity.

Public pages explain the service and quote-before-work sequence. Account pages share a dedicated layout. Authenticated routes expose workspace, updates and sign-out navigation. Client, artisan and operator job cards display the same seven-stage progress indicator; cancelled and disputed bookings use an explicit exception state instead of suggesting progress.

All booking operations, ownership checks, quote approval, evidence handling and handover rules remain server-controlled. No data migration or production-data mutation accompanies this release.

Validation: 64 unit tests; all 6 existing browser scenarios pass (authenticated lifecycle, operations, registration failure recovery and public smoke checks). Separate rendered checks cover 320–1440px public pages and 320–1440px role dashboards. Axe found no WCAG A/AA violations on the checked public and role dashboard screens. This automated review does not replace a full accessibility audit.
