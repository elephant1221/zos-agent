# Contributing to zOS Agent

Thank you for your interest in contributing to zOS Agent.

zOS Agent is an open-source AI-assisted diagnostic framework for IBM z/OS system programming.

Contributions are welcome in areas such as:

- Diagnostic workflows
- z/OS troubleshooting checklists
- JCL and JES2 analysis
- SMP/E diagnostic guidance
- SYSLOG and JOBLOG analysis
- USS and zFS troubleshooting
- Documentation improvements
- Sanitized examples
- Test cases
- Knowledge indexing

## Public-Safe Contributions

Do not submit confidential, customer-specific, or production-sensitive information.

Before opening an issue, pull request, or uploading an example, sanitize:

- Customer and company names
- LPAR and sysplex names
- Hostnames
- IP addresses
- User IDs
- Passwords, tokens, keys, and certificates
- RACF profiles
- Dataset HLQs
- Internal application names
- Production job names
- Ticket or change numbers
- Proprietary business information

Use example values such as:

- `LPAR1`
- `SYSPLEX1`
- `USER001`
- `JOB12345`
- `HLQ.INPUT.DATA`
- `VOL001`
- `192.0.2.10`

## Contribution Principles

Contributions should follow these principles:

1. Evidence first
2. Documented behavior before inference
3. Read-only checks before changes
4. Clearly separate facts from assumptions
5. Include validation where appropriate
6. Include fallback and risk notes for production-sensitive changes

## Documentation Contributions

Documentation improvements are encouraged.

Please keep technical content:

- Clear
- Reproducible
- Vendor-neutral where possible
- Properly attributed
- Safe for public distribution

Do not copy copyrighted manuals, proprietary documentation, or customer material into this repository.

References to vendor documentation may be provided using publication titles, publication numbers, or public documentation links.

## Issues

When reporting a problem or proposing an improvement, include:

- Area or component
- Expected behavior
- Observed behavior
- Relevant sanitized messages
- z/OS or product level if known
- Steps already checked

## Pull Requests

Keep pull requests focused on one logical change when possible.

Describe:

- What changed
- Why it changed
- How it was validated
- Any risk or compatibility considerations

## Production Safety

Do not treat repository examples as authorization to perform production changes.

Production changes must follow local change-control, security, operational, and fallback procedures.

## License

By contributing to this repository, you agree that your contributions may be distributed under the Apache License 2.0 used by this project.
