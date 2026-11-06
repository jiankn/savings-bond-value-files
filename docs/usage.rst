Reading and exporting a value file
========================================

Use a fixed redemption month for reproducible comparisons. A request for an
unavailable official month fails; it never generates an estimated value.

Online JSON and CSV
-------------------

.. code-block:: sh

   node bin/cli.mjs --period 2023-05 > values.json
   node bin/cli.mjs --period 2023-05 --format csv > values.csv

The API client requests one period and validates page counts, row counts,
duplicate keys and the returned redemption period. It rejects incomplete or
inconsistent responses instead of silently emitting a partial download.

Offline conversion
------------------

To convert the recorded official fixture without a network request:

.. code-block:: sh

   node bin/cli.mjs --input tests/fixtures/treasury-2023-05.json --format csv

The input may be the Treasury response object with a ``data`` array, or the
array itself. Offline conversion permits partial extracts; it does not certify
that a file contains every issue year or series.

Library usage
-------------

From a source checkout:

.. code-block:: js

   import { fetchValuePeriod, lookupUnitValue } from './src/index.mjs';

   const table = await fetchValuePeriod('2023-05');
   const cents = lookupUnitValue(table, 'I', '2002-03');
   console.log(cents); // 6400
   console.log(table.sourceUrl, table.retrievedAt);

In the Treasury's May 2023 file this historical cell is 6,400 cents per $25
face value. It is a historical example, not today's value.

Public functions
----------------

``amountToCents(value)``
  Parse a nonnegative decimal string with exactly two decimal places.
  ``null`` and the string ``"null"`` become ``null``. Invalid formats and unsafe
  integer amounts fail.

``normalizeRows(rows)``
  Convert a nonempty array of official rows into periods sorted by month.

``lookupUnitValue(period, series, issue)``
  Look up an integer-cent $25-unit value, or ``null`` when the cell is absent.
  The accepted series names are ``E``, ``EE``, ``I`` and ``SN``.

``fetchValuePeriod(period, options?)``
  Fetch one month. Optional ``signal`` and ``fetchImpl`` support cancellation and
  offline testing. Output includes source URLs and a retrieval timestamp.

``toCsv(periods)``
  Export one row per issue month. All amounts remain integer cents.
