Savings Bond Value Files for developers
========================================

``savings-bond-value-files`` is a dependency-free Node.js library and CLI that
reads the U.S. Treasury's public ``sb_value`` dataset. It converts decimal amount
strings into integer cents and keeps missing cells separate from zero values.

For individual-bond calculations and a browser-based savings bond calculator,
use `Savings Bond Calculator <https://savingsbondcalculator.org/>`_. This library
is the data-format adapter, while the website handles the interactive workflow.

.. toctree::
   :maxdepth: 2

   usage
   data-contract

Source and installation
-----------------------

Requires Node.js 22.12 or newer. Get the source and versioned release artifacts
from `GitHub <https://github.com/jiankn/savings-bond-value-files>`_.

.. code-block:: sh

   git clone https://github.com/jiankn/savings-bond-value-files.git
   cd savings-bond-value-files
   npm test
   node bin/cli.mjs --period 2023-05 --format csv > values.csv

The package can also be installed from a release ``.tgz`` file using
``npm install ./savings-bond-value-files-0.1.0.tgz``.

Official sources
----------------

* `Treasury dataset <https://fiscaldata.treasury.gov/datasets/savings-bond-value-files/>`_
* `Treasury API documentation <https://fiscaldata.treasury.gov/api-documentation/>`_
* `Treasury sb_value API <https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/sb_value>`_

The repository includes an unmodified historical API response, its retrieval
timestamp and SHA-256. Tests compare every amount field in that response.
The package does not bundle current interest rates or forecasts.

Not affiliated with the U.S. Department of the Treasury or TreasuryDirect.
For information only — confirm the value with TreasuryDirect before cashing a
bond. Not financial or tax advice.
