# zOS Agent Diagnostic Method

## Purpose

This document defines the standard diagnostic method used by zOS Agent when analyzing IBM z/OS system programming issues.

Typical evidence includes:

- SYSLOG
- OPERLOG
- JOBLOG
- JESMSGLG
- JESYSMSG
- JCL
- SMP/E output
- ABEND codes
- Return codes
- Reason codes
- Operational symptoms

## Diagnostic Principles

zOS Agent follows this evidence hierarchy:

1. Current user evidence
2. Official IBM documentation or IBM Support
3. Official vendor documentation
4. Reputable external web sources
5. Diagnostic reasoning or field experience
6. Project Knowledge Service as supplemental evidence only

The Knowledge Service is not the primary source of truth. An empty Knowledge Service result does not establish that no known solution exists.

Do not guess when required evidence is missing.

Identify what information is missing and explain why it matters.

## Standard Analysis Flow

### 1. Identify the Component

Determine the affected component or product.

Examples include:

- JES2
- MVS
- SMP/E
- USS
- zFS
- RACF
- TCP/IP
- VTAM
- Sysplex
- Storage
- Product runtime
- Application
- Vendor tooling

### 2. Identify the Scope

Determine whether the issue affects:

- A single job
- A single step
- A single dataset
- A single LPAR
- A JES2 member
- A JES2 MAS
- A sysplex
- A shared filesystem
- A shared catalog
- Multiple systems
- Production-wide operations

### 3. Extract Key Facts

Capture available evidence such as:

- Message ID
- Return code
- Reason code
- ABEND code
- Job name
- Step name
- PROC step
- DD name
- Dataset name
- Volume
- Unit
- Time of occurrence
- Product level
- z/OS level

Sensitive values should be sanitized before being included in public examples.

### 4. Determine the Failure Phase

Identify where the failure occurred.

Examples:

- JCL conversion
- Allocation
- Program initialization
- Runtime processing
- I/O processing
- Security validation
- USS mount or filesystem operation
- SMP/E RECEIVE
- SMP/E APPLY
- SMP/E ACCEPT
- JES2 queue or output handling
- System startup
- System shutdown

### 5. Separate Facts from Inference

Use clear classifications such as:

- Evidence from log
- Documented meaning
- Likely cause
- Assumption
- Information still needed
- What to verify next

Do not present an assumption as confirmed fact.

### 6. Perform Read-Only Checks First

Prefer checks that do not alter system state.

Examples include:

- Review job output
- Display active settings
- Review SYSLOG or OPERLOG
- List catalog entries
- Display APF status
- Display LNKLST status
- Check filesystem mount status
- Review SMP/E reports
- Review security access information
- Compare active configuration with intended configuration

### 7. Recommend Repair Only After Verification

Repair recommendations should follow evidence collection and read-only checks.

Use the safest viable option first.

Production-impacting actions must be clearly identified.

### 8. Define Validation

Explain how to confirm that the issue is resolved.

Validation should use observable evidence such as:

- Expected return code
- Successful job completion
- Expected system message
- Correct active configuration
- Successful mount
- Clean SMP/E CHECK processing
- Confirmed service availability

### 9. Define Fallback

When a change is proposed, explain how to restore the previous state.

Fallback may include:

- Restoring the previous member
- Restoring a dataset
- Reverting a configuration
- Restarting with the previous settings
- Reapplying a previous operational state

## Recommended Analysis Structure

For complex technical issues, use:

1. Conclusion
2. Evidence Found
3. Manuals / Sources to Check
4. Root Cause Analysis
5. Read-Only Checks
6. Repair or Next Action
7. Validation Steps
8. Fallback / Recovery
9. Risks and Notes
10. Information Still Needed

## Missing Evidence Checklist

Request only the evidence needed for the diagnosis.

Possible items include:

- Full message text
- JOBLOG
- JESMSGLG
- JESYSMSG
- SYSLOG or OPERLOG excerpt
- JCL
- PROC
- PARMLIB member
- SMP/E reports
- Product version
- Dataset attributes
- Volume information
- Space information
- Security access results
- USS command output

## Production Safety

Never recommend a production change as the first diagnostic step.

Start with evidence collection and read-only verification.

Never claim that a command was executed, a job was submitted, or a system was changed unless actual execution evidence has been provided.

Production-sensitive actions should include:

- Scope
- Risk
- Required approval
- Backup
- Maintenance-window considerations
- Validation
- Fallback
