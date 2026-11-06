Data contract and limitations
=============================

Official series codes
---------------------

The Treasury uses ``N`` for Series EE and ``S`` for savings notes. The parser
maps these to ``EE`` and ``SN``, while ``E`` and ``I`` keep their names. Every
issue-year array contains twelve positions, January first.

Normalized output
-----------------

Each period has ``period``, ``units: "cents"``, ``denominationCents: 2500`` and
``series``. Values are integers or ``null``. Source conversion uses decimal
strings and integer arithmetic, avoiding a floating-point dollar intermediate.

Missing cells and zero
------------------------------

A missing amount remains ``null`` in JSON and an empty amount cell in CSV.
An official ``"0.00"`` remains the integer ``0`` in both outputs. The package
does not replace zero with an estimated accounting value.

CSV columns
-----------

``redemption_period,series,issue_month,unit_value_cents,denomination_cents``

``unit_value_cents`` is an amount per $25 face value in the official file.
It is not the value of an arbitrary electronic purchase amount. Do not assume
it represents accrued value, purchase price, tax basis or current interest rate.

Scope
-----

This package parses and retrieves public files. It does not implement interest
accrual, tax calculations, early-redemption penalties or electronic-bond scaling.
Read the `calculation methodology <https://savingsbondcalculator.org/methodology/>`_
for how the browser tool handles these separate concerns and its limitations.

Network errors, missing official months, invalid fields and conflicting duplicate
rows fail explicitly. A successful parse of a partial local extract does not
prove that the full official dataset is present.
