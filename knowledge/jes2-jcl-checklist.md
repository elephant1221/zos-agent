# zOS Agent JES2 and JCL Diagnostic Checklist

## Purpose

This checklist provides a structured method for reviewing JCL, PROC usage, JES2 behavior, job output, allocation failures, and batch execution symptoms.

## Public-Safe Rule

Do not publish real customer-specific information such as:

- Production job names
- Dataset HLQs
- Account codes
- JES2 node names
- Printer destinations
- Internal routing values
- Customer system names

Use generic examples such as:

- `JOB12345`
- `HLQ.INPUT.DATA`
- `HLQ.OUTPUT.DATA`
- `SYS1.PROCLIB`
- `VOL001`

## 1. Review the JOB Statement

Check:

- Job name format
- CLASS
- MSGCLASS
- MSGLEVEL
- REGION
- NOTIFY
- Accounting information if present

## 2. Review the EXEC Statement

Check:

- PGM or PROC
- PARM syntax
- PROC overrides
- Step order
- Conditional execution
- IF / THEN / ELSE logic
- COND processing

## 3. Review DD Statements

Check:

- DSN
- DISP
- UNIT
- VOL=SER
- SPACE
- DCB
- SYSOUT
- PATH for USS files
- Temporary datasets
- Concatenations

## 4. Review Allocation Risks

Common allocation problems include:

- Dataset does not exist
- Dataset already exists with incompatible DISP
- Insufficient space
- Incorrect volume
- Incorrect SMS class
- Catalog conflict
- Dataset in use
- Security authorization failure

## 5. Review Common DD Names

Pay particular attention to:

- SYSIN
- SYSTSIN
- SYSTSPRT
- SYSPRINT
- SYSUT1
- SYSUT2
- STEPLIB
- JOBLIB
- SORTWKxx
- Product-specific DD names

## 6. Review JES Job Output

For batch jobs, identify:

- Job name
- Job ID
- Start time
- End time
- System or LPAR if shown
- Step return codes
- Highest condition code
- ABEND code
- Program name
- DD name involved
- Dataset involved
- Allocation messages
- Security messages
- Product messages

## 7. Review JES Output Sections

Important JES output includes:

### JESMSGLG

Review job-level and system messages.

### JESJCL

Review expanded JCL after PROC expansion and overrides.

### JESYSMSG

Review allocation, execution, and system-generated messages.

### SYSOUT DDs

Review program-specific output and diagnostic messages.

## 8. Identify the First Meaningful Error

Do not diagnose only from the final return code.

Find the earliest meaningful error in:

- JESMSGLG
- JESYSMSG
- SYSOUT
- Product output

Later messages may be secondary symptoms.

## 9. Common Failure Patterns

### JCL Error

Check:

- Syntax
- Continuation rules
- Missing commas
- Invalid keywords
- PROC override errors

### Allocation Failure

Check:

- DD name
- Dataset
- DISP
- Catalog
- Volume
- UNIT
- SPACE
- SMS classes
- Security access

### Program ABEND

Check:

- Program messages
- SYSOUT
- Dump information
- ABEND code
- Return code
- Reason code
- Product documentation

### Condition Code Failure

Check:

- Prior step return codes
- COND parameters
- IF / THEN / ELSE logic

### STEPLIB / JOBLIB Issue

Check:

- Library order
- Dataset existence
- Product level
- APF requirements
- LNKLST alternatives
- Mixed library levels

## 10. JES2 Scope Questions

Determine whether the problem affects:

- Job submission
- Conversion
- Execution
- Output
- Purge
- Routing
- Spool processing

Also determine whether the scope is:

- One job
- One class
- One JES2 member
- MAS-wide
- Node-related

## Recommended Analysis Format

For JES2 or JCL issues, use:

1. Conclusion
2. Evidence Found
3. JCL / JES2 Area Involved
4. Likely Cause
5. Read-Only Checks
6. Suggested JCL Change or Operational Next Step
7. Validation
8. Risk and Fallback

## Safe Review Principle

JCL that appears structurally valid from supplied text must still be validated in the target environment.

Dataset names, SMS classes, security access, PROC libraries, APF requirements, and product levels are site-specific.
