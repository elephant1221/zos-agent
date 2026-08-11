# Security Policy

## Purpose

zOS Agent is an open-source diagnostic framework for IBM z/OS system programming.

Because diagnostic evidence may contain sensitive infrastructure information, security and privacy must be considered before submitting issues, examples, logs, or contributions.

## Reporting a Security Issue

If you discover a security issue in this repository, do not publish sensitive technical details in a public GitHub issue.

If GitHub private vulnerability reporting is available for this repository, use that mechanism.

If private reporting is not available, open a public issue containing only a high-level description and request a private communication channel.

Do not include secrets, credentials, production configuration, or customer information in the public report.

## Sensitive Information

Never submit real:

- Passwords
- API keys
- Access tokens
- Certificates or private keys
- Customer names
- Internal hostnames
- Internal IP addresses
- User IDs
- RACF profiles
- Dataset HLQs
- Sysplex names
- LPAR names
- Production job names
- Change records or ticket numbers
- Proprietary business data

Use sanitized example values such as:

- `LPAR1`
- `SYSPLEX1`
- `USER001`
- `JOB12345`
- `HLQ.DATASET.NAME`
- `VOL001`
- `192.0.2.10`
- `HOST1.EXAMPLE.COM`

## Diagnostic Evidence

Before submitting SYSLOG, OPERLOG, JOBLOG, JES output, JCL, SMP/E output, PARMLIB content, USS output, or other diagnostic material:

1. Remove confidential values.
2. Remove credentials and secrets.
3. Replace internal identifiers with safe placeholders.
4. Review the material again before publishing.

## Production Safety

Examples and diagnostic guidance in this repository are not authorization to perform changes in production.

Production changes should follow local:

- Change-control procedures
- Security policies
- Approval requirements
- Maintenance-window procedures
- Backup requirements
- Validation procedures
- Fallback plans

Read-only checks should be preferred before configuration changes.

## Supported Versions

This project is under active development.

Security-related corrections should be applied to the current maintained version of the repository.

## Disclosure

Please allow reasonable time for investigation and remediation before publicly disclosing a confirmed security issue.
