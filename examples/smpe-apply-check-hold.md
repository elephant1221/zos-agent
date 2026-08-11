# Example: SMP/E APPLY CHECK Blocked by HOLD

## Purpose

This is a synthetic, public-safe example showing how zOS Agent can analyze an SMP/E APPLY CHECK that cannot proceed because of a HOLD and unresolved requisite service.

This example does not contain real customer CSI names, zone names, service-order information, or production SMP/E output.

The messages and SYSMOD identifiers below are illustrative.

## Scenario

A system programmer runs APPLY CHECK for a maintenance package.

The CHECK operation reports that one selected SYSMOD cannot be applied because required service has not yet been received.

Another SYSMOD fails secondarily because it depends on the first one.

## Sanitized Evidence

```text
SMP/E OPERATION: APPLY CHECK
TARGET ZONE: TARGET
SOURCE: RSU

RETURN CODE: 08

SYSMOD UJ00001
  STATUS: FAILED
  CONDITION: ERROR HOLD
  RESOLVING SYSMOD: UJ00003
  RESOLVING SYSMOD NOT RECEIVED

SYSMOD UJ00002
  STATUS: FAILED
  CONDITION: REQUISITE FAILURE
  REQUIRES: UJ00001

APPLY CHECK NOT CLEAN
