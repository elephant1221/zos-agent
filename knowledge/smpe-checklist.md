# zOS Agent SMP/E Diagnostic Checklist

## Purpose

This checklist provides a structured method for analyzing IBM SMP/E maintenance evidence.

Typical inputs include:

- RECEIVE output
- APPLY CHECK output
- ACCEPT CHECK output
- REPORT ERRSYSMODS
- REPORT MISSINGFIX
- HOLDDATA
- FIXCAT
- RSU
- HIPER
- PE-related service information

## Public-Safe Rule

Do not publish real customer-specific SMP/E information.

Sanitize values such as:

- CSI dataset names
- Zone names
- Dataset HLQs
- Service order numbers
- Customer-specific SYSMOD inventory
- Proprietary job output

Use generic examples such as:

- `GLOBAL`
- `TARGET`
- `DLIB`
- `HLQ.SMPE.CSI`
- `UJ00000`
- `UI00000`

## 1. Identify the SMP/E Operation

Determine whether the evidence is related to:

- RECEIVE
- APPLY CHECK
- APPLY
- ACCEPT CHECK
- ACCEPT
- RESTORE
- REPORT ERRSYSMODS
- REPORT MISSINGFIX
- LIST

## 2. Identify the Zone Scope

Determine the affected scope:

- GLOBAL zone
- TARGET zone
- DLIB zone
- Product-specific CSI
- Shared CSI

## 3. Identify the Service Source

Examples include:

- RSU
- HIPER
- PE
- FIXCAT
- Individual PTF
- Product installation FMID
- Enhanced HOLDDATA

## 4. Review the Return Code

The return code must always be reviewed together with the associated SMP/E messages.

Typical interpretation:

- `RC=0` — clean completion
- `RC=4` — warning; review messages
- `RC=8` — error; action is normally required
- `RC=12` or higher — serious error; review syntax, allocation, zone, or input problems

## 5. Extract Key GIM Messages

Record important SMP/E messages, especially:

- `GIM2xxxx`
- `GIM3xxxx`
- `GIM4xxxx` or higher when present

Do not rely only on the final return code.

Identify the first meaningful SMP/E error.

## 6. Review HOLDDATA

Determine whether any of the following are present:

- ERROR HOLD
- SYSTEM HOLD
- USER HOLD
- ACTION HOLD
- DOC HOLD
- ENH HOLD
- PE HOLD
- HIPER-related HOLD

Do not bypass HOLDs without understanding their requirements.

## 7. Review Requisites

Check for unresolved:

- PRE
- REQ
- IFREQ
- SUP
- Missing SYSMODs
- Resolving SYSMODs not received
- Superseding service

Distinguish between the SYSMOD that directly failed and other SYSMODs that failed because of it.

## 8. Review FIXCAT and MISSINGFIX

Verify:

- Whether current Enhanced HOLDDATA was received
- Which FIXCAT categories were selected
- Whether missing fixes apply to the target product and release
- Whether missing fixes are already superseded by received service

Example:

`FIXCAT(IBM.TargetSystem-RequiredService.z/OS.V3R1)`

The example above is generic and must be validated for the target environment.

## 9. Review ERRSYSMODS

Determine:

- Whether applied SYSMODs are identified as being in error
- Whether a resolving SYSMOD is identified
- Whether the resolving SYSMOD has been received
- Whether APPLY CHECK is clean after resolving service is received

## 10. Direct and Secondary Failures

### Direct Failure

A SYSMOD directly fails because of conditions such as:

- HOLD
- Missing requisite
- Error condition
- Required service not received

### Secondary Failure

A SYSMOD fails because another prerequisite, requisite, or superseding SYSMOD failed.

Identify the direct failure first.

## APPLY CHECK Review

For APPLY CHECK, identify:

- Target zone
- Selected SYSMODs or source ID
- Return code
- ERROR HOLDs
- ACTION, DOC, or ENH HOLDs
- Missing requisites
- PE or HIPER exposure
- SYSMODs that would be applied
- SYSMODs that would fail
- Any requested BYPASS processing

### Safety Rule

Run APPLY CHECK before APPLY.

Do not proceed with APPLY until APPLY CHECK is clean or every remaining condition has been reviewed and approved.

## ACCEPT CHECK Review

For ACCEPT CHECK, identify:

- DLIB zone
- Relationship to the target zone
- Applied but not accepted SYSMODs
- Failed ACCEPT candidates
- Unresolved HOLDs
- Requisite problems
- Superseded conditions
- Fallback impact

### Important Safety Rule

Run ACCEPT CHECK before ACCEPT.

ACCEPT reduces fallback options.

Confirm the restore and fallback strategy before ACCEPT.

## Recommended Analysis Format

For SMP/E issues, use:

1. Conclusion
2. SMP/E Operation and Scope
3. Return Code
4. Key GIM Messages
5. HOLD Summary
6. Missing Requisites / Resolving SYSMODs
7. FIXCAT / HIPER / PE Status
8. Direct Failures
9. Secondary Failures
10. Recommended Next Action
11. Validation
12. Risk / Fallback Notes

## Safe Recommendation Pattern

A safe diagnostic recommendation should normally follow this sequence:

Review the listed HOLDs and requisites, receive any required resolving service or current HOLDDATA, and rerun APPLY CHECK.

Do not run APPLY until APPLY CHECK is clean or all remaining conditions and bypass requirements have been reviewed and approved.
