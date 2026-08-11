# zOS Agent SYSLOG and JOBLOG Analysis Template

## Purpose

This template provides a structured method for analyzing sanitized IBM z/OS diagnostic evidence such as:

- SYSLOG
- OPERLOG
- JOBLOG
- JESMSGLG
- JESYSMSG
- JESJCL
- SYSOUT

## Public-Safe Reminder

Before publishing diagnostic evidence, sanitize sensitive information.

Remove or replace:

- Customer names
- Internal system names
- LPAR names
- Sysplex names
- Hostnames
- IP addresses
- User IDs
- Dataset HLQs
- RACF profiles
- Certificates
- Secrets
- Internal application names
- Email addresses

Use generic examples such as:

- `LPAR1`
- `JOB12345`
- `USER001`
- `HLQ.DATASET.NAME`
- `192.0.2.10`

## 1. Initial Intake

Identify or ask:

- What failed?
- When did it fail?
- Which job, task, started task, or component was involved?
- Which LPAR or system scope was affected?
- What changed recently?
- Is this test, development, maintenance, production, or DR?
- Did the failure occur during:
  - IPL
  - Shutdown
  - Batch execution
  - Online processing
  - Maintenance
  - Product startup
  - Product shutdown

## 2. Extract Key Messages

Record important information such as:

- Message IDs
- Severity indicators
- Return codes
- Reason codes
- ABEND codes
- Dataset names
- DD names
- Step names
- PROC step names
- Program names
- Timestamps
- Repeating messages
- Product-specific messages

## 3. First Error Rule

Do not diagnose only from the final failure message.

Find the earliest meaningful error.

Later messages may be secondary symptoms caused by the first failure.

Example sequence:

1. Normal initialization
2. Warning
3. First meaningful error
4. Secondary failures
5. Termination or recovery
6. Final return code or ABEND

## 4. Build a Timeline

Create a short chronological sequence.

Example:

```text
10:01:02  Job started
10:01:04  Allocation completed
10:01:06  First warning
10:01:07  First meaningful error
10:01:08  Secondary message
10:01:10  Step terminated
10:01:11  Final return code issued
