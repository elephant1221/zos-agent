# zOS Agent

Open-source AI-assisted diagnostic framework for IBM z/OS system programming.

## Overview

zOS Agent is an independent, open-source diagnostic and knowledge framework for IBM z/OS system programmers, mainframe support analysts, and technical teams.

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

zOS Agent is designed as a diagnostic and workflow assistant.

It is not an autonomous production change tool.

---

## Quick Start

A typical diagnostic question may look like:

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

For SMP/E：
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

For JCL:
Review this JCL for:
- Syntax
- PROC overrides
- DD allocation risks
- Dataset disposition
- SPACE
- SMS considerations
- STEPLIB / JOBLIB concerns
- Production safety
