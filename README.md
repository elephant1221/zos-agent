# zOS Agent

Open-source AI-assisted diagnostic framework for IBM z/OS system programming.

## Overview

zOS Agent is an independent, AI-assisted diagnostic and knowledge framework for IBM z/OS system programmers, mainframe support analysts, and technical teams.

It is designed to help analyze sanitized technical evidence such as:

- SYSLOG and OPERLOG
- JOBLOG, JESMSGLG, JESYSMSG and JESJCL
- JCL and PROC members
- SMP/E RECEIVE, APPLY CHECK and ACCEPT CHECK output
- ABEND codes
- Return codes and reason codes
- z/OS UNIX System Services
- zFS and mount-related issues
- JES2 operational symptoms
- RACF, APF, LNKLST and related configuration issues

## Diagnostic Philosophy

zOS Agent follows an evidence-first diagnostic method:

1. Evidence from logs and job output
2. Documented product behavior
3. Best practices
4. Field experience
5. Clearly identified inference

Read-only checks should be performed before recommending changes.

## Typical Diagnostic Workflow

A technical analysis may include:

1. Conclusion
2. Evidence Found
3. Likely Cause
4. Read-Only Checks
5. Fix or Next Action
6. Validation Steps
7. Fallback / Recovery
8. Risks and Notes
9. Information Still Needed

## Main Areas

Current project areas include:

- MVS initialization and PARMLIB
- JES2 and JCL
- SMP/E maintenance
- SYSLOG and JOBLOG analysis
- USS and zFS
- Sysplex and XCF
- RACF and security-related diagnostics
- TCP/IP and VTAM
- APF, LNKLST, LPALST and STEPLIB
- ABEND, return code and reason code analysis

## Production Safety

zOS Agent is a diagnostic and workflow assistant.

It is not an autonomous production change tool.

For production-sensitive work, recommendations should include:

- Read-only verification first
- Backup or capture of current state
- Change scope
- Required approvals
- Validation
- Fallback planning
- Risk assessment

For SMP/E maintenance:

- Run APPLY CHECK before APPLY
- Run ACCEPT CHECK before ACCEPT
- Review HOLDs and requisites before proceeding
- Confirm fallback strategy before ACCEPT

## Privacy and Public-Safe Data

Do not upload confidential customer or production information to public repositories.

Sanitize values such as:

- Customer names
- Internal LPAR and sysplex names
- Hostnames
- IP addresses
- User IDs
- Passwords and secrets
- RACF profiles
- Dataset HLQs
- Internal application names
- Production job names
- Change or ticket numbers

Use generic example values such as:

- `LPAR1`
- `SYSPLEX1`
- `USER001`
- `JOB12345`
- `HLQ.INPUT.DATA`
- `VOL001`
- `192.0.2.10`

## Project Goals

The project aims to make z/OS troubleshooting more structured, reproducible, explainable, and safe.

Future work may include:

- Sanitized diagnostic examples
- Structured troubleshooting checklists
- Message and ABEND analysis workflows
- Test cases
- Knowledge indexing
- Documentation tooling
- AI-assisted maintainer workflows

## Status

This project is under active development.

Contributions, technical feedback, documentation improvements, and sanitized diagnostic examples are welcome.

## Independence Notice

zOS Agent is an independent open-source project.

It is not affiliated with, endorsed by, or sponsored by IBM.

IBM, IBM Z, and z/OS are trademarks of International Business Machines Corporation.
