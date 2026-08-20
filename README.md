# zOS Agent Elephant

Open-source AI-assisted diagnostic framework for IBM z/OS system programming.

## Overview

zOS Agent is an independent, open-source AI-assisted diagnostic and knowledge framework for IBM z/OS system programmers, mainframe support analysts, and technical teams.

It helps turn sanitized z/OS technical evidence into structured diagnostic analysis.

Typical inputs include:

- SYSLOG and OPERLOG
- JOBLOG
- JESMSGLG
- JESYSMSG
- JESJCL
- JCL and PROC members
- SMP/E output
- ABEND codes
- Return codes
- Reason codes
- USS and zFS evidence
- Configuration-related symptoms

zOS Agent is designed as a diagnostic, knowledge, and workflow assistant.

It is not an autonomous production change tool.

## Version Status

The repository is at **V1.2 Public MVP** for the Public GPT / Knowledge Service integration.

V1.2 provides public reads and untrusted public submissions. Trusted ingestion, trusted maturity promotion, and publication workflows belong to V1.3+ and are not required for V1.2 acceptance. See [Public Knowledge Service V1.2](docs/knowledge-service-v1.2.md) for the exact boundary.

---

## Project Navigation

### Documentation

- [Diagnostic Method](docs/diagnostic-method.md)
- [Safety and Change Control](docs/safety-and-change-control.md)
- [Public Knowledge Service V1.2](docs/knowledge-service-v1.2.md)
- [Public GPT Behavior](docs/gpt-behavior.md)
- [Knowledge Service Deployment](docs/deployment.md)
- [V1.2 Public MVP Testing](docs/testing.md)

### Public GPT Action

- [OpenAPI Action Schema](openapi/zos-agent-public-gpt-actions-v1.2.yaml)

### Knowledge

- [SMP/E Diagnostic Checklist](knowledge/smpe-checklist.md)
- [JES2 and JCL Diagnostic Checklist](knowledge/jes2-jcl-checklist.md)
- [USS and zFS Diagnostic Checklist](knowledge/uss-zfs-checklist.md)
- [SYSLOG and JOBLOG Analysis Template](knowledge/syslog-joblog-analysis-template.md)
- [IBM Manual Knowledge Index](knowledge/manual-knowledge-index.md)

### Examples

- [JOBLOG Dataset Allocation Failure](examples/joblog-allocation-failure.md)
- [SMP/E APPLY CHECK Blocked by HOLD](examples/smpe-apply-check-hold.md)

### Project Policies

- [Contributing Guidelines](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Apache License 2.0](LICENSE)

---

## Quick Start

A typical diagnostic request may look like:

```text
Analyze this sanitized JOBLOG.

Please identify:
1. The first meaningful error
2. The affected z/OS component
3. The likely root cause
4. Read-only checks
5. Recommended next action
6. Validation
7. Fallback and risk
```

For SMP/E:

```text
Analyze this APPLY CHECK output.

Identify:
- Return code
- Key GIM messages
- HOLDs
- Missing requisites
- Resolving SYSMODs
- Direct failures
- Secondary failures
- Safe next action
```

For JCL:

```text
Review this JCL for:
- Syntax
- PROC overrides
- DD allocation risks
- Dataset disposition
- SPACE
- SMS considerations
- STEPLIB / JOBLIB concerns
- Production safety
```

For SYSLOG:

```text
Analyze this sanitized SYSLOG excerpt.

Identify:
- First meaningful error
- Timeline
- Affected component
- Primary failure
- Secondary symptoms
- Read-only checks
- Safe next action
```

---

## Diagnostic Philosophy

zOS Agent follows an evidence-first diagnostic method:

1. Current user evidence
2. Official IBM documentation or IBM Support
3. Official vendor documentation
4. Reputable external web sources
5. Diagnostic reasoning or field experience
6. Project Knowledge Service as supplemental evidence only

Facts and assumptions should be separated.

Read-only checks should come before changes.

The Knowledge Service is not the primary source of truth. A no-result response must never be interpreted as "no known solution."

See:

- [Diagnostic Method](docs/diagnostic-method.md)

---

## Diagnostic Workflow

For complex technical issues, zOS Agent uses a structure such as:

1. Conclusion
2. Evidence Found
3. Likely Component
4. Root Cause Analysis
5. Read-Only Checks
6. Repair or Next Action
7. Validation Steps
8. Fallback / Recovery
9. Risks and Notes
10. Information Still Needed

The goal is to identify the earliest meaningful failure rather than diagnosing only from the final error or return code.

---

## Knowledge Areas

### SMP/E

The SMP/E diagnostic workflow covers areas such as:

- RECEIVE
- APPLY CHECK
- APPLY
- ACCEPT CHECK
- ACCEPT
- RESTORE
- HOLDDATA
- ERROR HOLD
- ACTION HOLD
- DOC HOLD
- ENH HOLD
- HIPER
- PE
- FIXCAT
- REPORT ERRSYSMODS
- REPORT MISSINGFIX
- PRE
- REQ
- IFREQ
- Resolving SYSMOD analysis
- Direct and secondary failures

Safety principles include:

- Run APPLY CHECK before APPLY
- Review HOLDs before APPLY
- Do not bypass HOLDs without understanding them
- Run ACCEPT CHECK before ACCEPT
- Confirm fallback before ACCEPT

See:

- [SMP/E Diagnostic Checklist](knowledge/smpe-checklist.md)
- [SMP/E APPLY CHECK Blocked by HOLD](examples/smpe-apply-check-hold.md)

---

### JES2 and JCL

The JES2 and JCL workflow covers:

- JOB statements
- EXEC statements
- DD statements
- PROC processing
- PROC overrides
- JESMSGLG
- JESJCL
- JESYSMSG
- SYSOUT
- Dataset allocation
- DISP
- SPACE
- UNIT
- VOL=SER
- Catalog
- SMS
- ABEND analysis
- Condition codes
- STEPLIB
- JOBLIB
- JES2 execution and output scope

See:

- [JES2 and JCL Diagnostic Checklist](knowledge/jes2-jcl-checklist.md)
- [JOBLOG Dataset Allocation Failure](examples/joblog-allocation-failure.md)

---

### SYSLOG and JOBLOG

The SYSLOG and JOBLOG workflow focuses on:

- Message IDs
- Return codes
- Reason codes
- ABEND codes
- Program names
- Step names
- DD names
- Dataset information
- Timestamps
- First meaningful error
- Timeline reconstruction
- Primary failure
- Secondary symptoms
- Component classification

Relevant evidence may include:

- SYSLOG
- OPERLOG
- JOBLOG
- JESMSGLG
- JESJCL
- JESYSMSG
- SYSOUT

See:

- [SYSLOG and JOBLOG Analysis Template](knowledge/syslog-joblog-analysis-template.md)

---

### USS and zFS

The USS and zFS workflow covers:

- z/OS UNIX System Services
- OMVS
- zFS
- HFS
- NFS
- BPXPRMxx
- Mount processing
- Filesystem datasets
- Mount points
- UNIX permissions
- UID and GID
- RACF OMVS segments
- UNIXPRIV
- ACLs
- VSAM linear datasets
- Catalog status
- SMS
- Filesystem space
- Volume space

Read-only checks may include commands such as:

```text
df -k
mount
ls -ld /path
ls -l /path
id
```

See:

- [USS and zFS Diagnostic Checklist](knowledge/uss-zfs-checklist.md)

---

## Documentation Knowledge Model

zOS Agent maintains a curated metadata index for IBM technical documentation.

The current knowledge map contains metadata for:

- 365 IBM z/OS manuals
- 13 IBM Redbooks
- 378 indexed documents in total

The primary technical target is IBM z/OS 3.1 system programming.

The project does not redistribute IBM manuals or IBM Redbooks.

The metadata index is used to help select documentation appropriate to:

- Component
- Product
- z/OS release
- Product level
- Message ID
- Return code
- Reason code
- Diagnostic operation

Preferred documentation areas include:

- MVS initialization and PARMLIB
- JES2
- SMP/E
- Sysplex and XCF
- JCL
- USS and zFS
- RACF
- Messages and system codes
- DFSMS, storage, VSAM, and catalog
- Dumps and diagnosis
- TCP/IP and VTAM

IBM Redbooks are treated as supplemental guidance for concepts, architecture, examples, and operational background.

Release-sensitive syntax and support information should be verified against documentation appropriate to the target z/OS release.

See:

- [IBM Manual Knowledge Index](knowledge/manual-knowledge-index.md)

---

## Evidence Priority

zOS Agent uses the following evidence priority:

```text
Current user evidence
        ↓
Official IBM documentation / IBM Support
        ↓
Official vendor documentation
        ↓
Reputable external web sources
        ↓
Diagnostic reasoning / field experience
        ↓
Project Knowledge Service (supplemental only)
```

Current technical evidence may include:

- SYSLOG
- OPERLOG
- JOBLOG
- JES output
- JCL
- Configuration members
- SMP/E output
- Return codes
- Reason codes
- ABEND information

---

## Production Safety

zOS Agent follows a safety-first approach for production-sensitive work.

The core rule is:

> Read-only checks come before changes.

Production-sensitive recommendations should include:

- Read-only verification
- Capture of current state
- Backup
- Scope of impact
- Required approvals
- Maintenance-window requirements
- Validation
- Fallback
- Risk assessment

High-risk areas include:

- PARMLIB
- PROCLIB
- JES2 initialization
- JES2 MAS and SPOOL
- SMP/E APPLY and ACCEPT
- RACF
- APF
- LNKLST
- LPALST
- TCP/IP
- VTAM
- Sysplex
- Couple datasets
- CFRM
- XCF
- BPXPRMxx
- zFS mounts
- Production started tasks
- IPL-related configuration

See:

- [Safety and Change Control](docs/safety-and-change-control.md)

---

## Public-Safe Data Policy

Do not publish real customer or production-confidential information.

Sanitize values such as:

- Customer names
- Company names
- LPAR names
- Sysplex names
- Hostnames
- IP addresses
- User IDs
- Passwords
- API keys
- Tokens
- Certificates
- RACF profiles
- Dataset HLQs
- Internal application names
- Production job names
- Change numbers
- Ticket numbers
- Internal email addresses
- Proprietary business data

Use generic examples such as:

```text
LPAR1
SYSPLEX1
USER001
JOB12345
HLQ.INPUT.DATA
HLQ.OUTPUT.DATA
VOL001
192.0.2.10
HOST1.EXAMPLE.COM
```

Before publishing SYSLOG, OPERLOG, JOBLOG, JES output, JCL, SMP/E output, configuration members, or USS output, review the material and remove confidential values.

The Knowledge Service stores sanitized and generalized reusable findings only. Public submissions are untrusted and do not promote EXPERIENCE maturity. Application-level accumulation in the Knowledge Service is not model-weight training.

---

## Synthetic Examples

Examples in this repository are synthetic and public-safe.

They are intended to demonstrate diagnostic reasoning without exposing customer environments.

Synthetic examples should:

- Use generic system names
- Use generic dataset names
- Avoid copied proprietary production output
- Clearly identify illustrative messages
- Demonstrate first-error analysis
- Include read-only checks
- Include validation
- Include fallback or risk where appropriate

Current examples:

- [JOBLOG Dataset Allocation Failure](examples/joblog-allocation-failure.md)
- [SMP/E APPLY CHECK Blocked by HOLD](examples/smpe-apply-check-hold.md)

---

## Project Structure

```text
zos-agent/
├── supabase/
│   ├── migrations/
│   ├── functions/knowledge-api/
│   └── tests/
│
├── openapi/
│   └── zos-agent-public-gpt-actions-v1.2.yaml
│
├── tests/
│   ├── knowledge-api.test.mjs
│   └── knowledge-api-handler.test.mjs
│
├── docs/
│   ├── diagnostic-method.md
│   ├── safety-and-change-control.md
│   ├── knowledge-service-v1.2.md
│   ├── gpt-behavior.md
│   ├── deployment.md
│   └── testing.md
│
├── knowledge/
│   ├── jes2-jcl-checklist.md
│   ├── manual-knowledge-index.md
│   ├── smpe-checklist.md
│   ├── syslog-joblog-analysis-template.md
│   └── uss-zfs-checklist.md
│
├── examples/
│   ├── joblog-allocation-failure.md
│   └── smpe-apply-check-hold.md
│
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
├── README.md
├── SECURITY.md
└── .env.example
```

---

## Project Goals

The project aims to make z/OS troubleshooting:

- Structured
- Reproducible
- Evidence-driven
- Explainable
- Safer for production environments
- Easier to document
- Easier to review
- Easier to maintain

V1.3+ backlog items include:

- MPBSDP trusted ingestion actions
- Validated and independent trusted observation handling
- Automatic `OBSERVED -> REPEATED` promotion from qualifying trusted observations only
- Atomic publication with approval gates and a `PUBLISHED` audit event

Additional future work may include:

- More sanitized diagnostic examples
- ABEND analysis workflows
- Message analysis templates
- Sysplex / XCF diagnostics
- RACF diagnostic workflows
- TCP/IP and VTAM troubleshooting
- PARMLIB analysis
- APF and LNKLST diagnostics
- Test cases
- Knowledge validation tooling
- AI-assisted maintainer workflows
- Documentation automation

---

## Contributing

Contributions are welcome in areas such as:

- Diagnostic workflows
- z/OS troubleshooting checklists
- Documentation
- Sanitized examples
- Test cases
- Knowledge indexing
- Technical corrections

Please read:

- [Contributing Guidelines](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

Do not submit confidential customer or production information.

---

## Security

Do not publish credentials, secrets, customer infrastructure information, or security-sensitive production data.

Security issues should be reported without exposing sensitive details publicly.

See:

- [Security Policy](SECURITY.md)

---

## License

This project is licensed under the Apache License 2.0.

See:

- [LICENSE](LICENSE)

---

## Status

The V1.2 Public MVP implementation is present and pending Supabase, PostgreSQL, Deno, and deployed integration validation. V1.3+ trusted-ingestion and publication controls are outside V1.2 acceptance.

Technical feedback, documentation improvements, sanitized examples, diagnostic workflows, and contributions are welcome.

---

## Independence Notice

zOS Agent is an independent open-source project.

It is not affiliated with, endorsed by, or sponsored by IBM.

IBM, IBM Z, and z/OS are trademarks of International Business Machines Corporation.
