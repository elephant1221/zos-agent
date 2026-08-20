# zOS Agent IBM Manual Knowledge Index

## Purpose

This document describes the public-safe IBM documentation knowledge model used by zOS Agent.

The project does not redistribute IBM manuals or IBM Redbooks.

Instead, its documentation model uses curated metadata to help identify the appropriate authoritative documentation for a z/OS diagnostic question.

## Current Index Scope

The external knowledge map is reported to contain metadata for:

- 365 IBM z/OS manuals
- 13 IBM Redbooks
- 378 indexed documents in total

The primary technical target is IBM z/OS 3.1 system programming.

The individual metadata records are not currently distributed in this repository. These counts describe the reported external map and are not a claim that 378 metadata rows can be inspected here. A future import should include provenance and a reproducible count.

## Evidence Priority

zOS Agent uses the following evidence hierarchy:

1. Current user evidence
2. Official IBM documentation or IBM Support
3. Official vendor documentation
4. Reputable external web sources
5. Diagnostic reasoning or field experience
6. Project Knowledge Service as supplemental evidence only

The Knowledge Service is not the primary source of truth.

Current evidence includes material such as:

- SYSLOG
- OPERLOG
- JOBLOG
- JESMSGLG
- JESYSMSG
- JCL
- SMP/E output
- Configuration members
- Return codes
- Reason codes
- ABEND information

## Manual Selection Principles

Before selecting documentation, identify:

- Component
- Product
- z/OS release
- Product version
- Message ID
- Return code
- Reason code
- Operation being performed

Do not use an unrelated manual simply because it contains a similar keyword.

## Preferred Documentation by Topic

### MVS Initialization and PARMLIB

Preferred documentation includes:

- MVS Initialization and Tuning Guide
- MVS Initialization and Tuning Reference
- MVS System Commands

### JES2

Preferred documentation includes:

- JES2 Commands
- JES2 Messages
- JES2 Initialization and Tuning Guide
- JES2 Initialization and Tuning Reference

### SMP/E

Preferred documentation includes:

- SMP/E User's Guide
- SMP/E Commands
- SMP/E Messages, Codes, and Diagnosis

### Sysplex and XCF

Preferred documentation includes:

- MVS Setting Up a Sysplex
- MVS Sysplex Services Reference

### JCL

Preferred documentation includes:

- MVS JCL Reference
- MVS JCL User's Guide

### USS and zFS

Preferred documentation includes:

- z/OS UNIX System Services User's Guide
- z/OS UNIX System Services Command Reference
- zFS Administration documentation

### RACF

Preferred documentation includes:

- RACF Security Administrator's Guide
- RACF Command Language Reference

### Messages, ABENDs, Return Codes and Reason Codes

Use the IBM message, system code, or product diagnosis manual that matches the component and release.

### Storage and Catalog

Use the DFSMS manual that matches the affected function, such as:

- DFSMSdfp
- Catalog
- VSAM
- DFSMShsm
- DFSMSdss
- DFSMSrmm

### Diagnosis and Dumps

Preferred sources include:

- IPCS documentation
- MVS Diagnosis
- Dump Output Messages
- MVS System Codes

## IBM Redbooks

IBM Redbooks are treated as supplemental technical guidance.

They may be useful for:

- Concepts
- Architecture
- Operational background
- Examples
- Historical implementation guidance

Redbooks must not be used alone to assert current z/OS 3.1 syntax, support status, or product behavior.

Current IBM z/OS manuals should be used to verify release-sensitive information.

## Public Repository Boundary

This repository does not contain IBM manual PDF files.

The public knowledge index may contain only information such as:

- Publication number
- Document title
- Logical category
- Document type
- Release association
- Standardized filename metadata
- Selection guidance

Users should obtain IBM documentation from authorized IBM documentation sources.

## Diagnostic Source Separation

Technical conclusions should distinguish between:

- Evidence from current logs or output
- IBM documented behavior
- Project best practice
- Field experience
- Inference

This separation is especially important for production-sensitive recommendations.

## Index Categories

The current internal knowledge map includes categories such as:

- DFSMS / Storage / Catalog
- Diagnosis / Dumps / Messages / Codes
- HLASM
- JCL
- JES2
- MVS
- RACF / Security
- SDSF
- SMP/E
- Sysplex / XCF
- TCP/IP / VTAM
- TSO / ISPF / REXX
- USS / zFS

## Maintenance

The index should be reviewed when:

- A new z/OS release is introduced
- IBM documentation is superseded
- Publication numbers change
- Product documentation changes
- New diagnostic areas are added to zOS Agent

Release-specific behavior must always be verified against the documentation appropriate to the target environment.
