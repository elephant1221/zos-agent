# zOS Agent USS and zFS Diagnostic Checklist

## Purpose

This checklist provides a structured method for analyzing IBM z/OS UNIX System Services, OMVS, zFS datasets, mount processing, BPXPRMxx definitions, and filesystem-related problems.

## Public-Safe Rule

Do not publish real customer-specific information such as:

- Mount points
- Internal server IP addresses
- NFS targets
- User IDs
- Group IDs
- UID/GID mappings
- Internal directory names
- Dataset HLQs

Use generic examples such as:

- `/u/user001`
- `/service/product`
- `/mnt/example`
- `HLQ.ZFS.FILESYS`
- `192.0.2.10:/export/path`

## 1. Identify the Command Context

Determine how the operation was performed.

Examples include:

- UNIX shell command
- TSO OMVS command
- BPXBATCH
- IKJEFT01 with SYSTSIN
- Console or automation
- BPXPRMxx processing

Record the exact command or configuration statement when available.

## 2. Identify the Filesystem Type

Determine whether the problem involves:

- zFS
- HFS legacy filesystem
- NFS
- Temporary filesystem
- Other USS filesystem types

## 3. Identify the Mount Context

Capture:

- Filesystem dataset
- Mount point
- Filesystem type
- Mount mode
- Read-only or read-write
- AUTOMOVE / NOAUTOMOVE behavior
- NFS options when applicable
- BPXPRMxx definition if involved

## 4. Review Authorization

Check whether the issue may involve:

- UID
- GID
- UNIX permission bits
- ACLs
- RACF OMVS segment
- Dataset authorization
- FACILITY class
- UNIXPRIV class
- Superuser requirements

Do not assume a permission failure is caused only by UNIX mode bits.

## 5. Review zFS Dataset and Catalog Status

For zFS datasets, verify:

- The VSAM linear dataset exists
- The catalog entry is correct
- The expected volume is available
- Sufficient volume space exists
- SMS classes are appropriate
- The dataset is not already mounted unexpectedly
- The dataset is not being used in an unexpected context

## 6. Review zFS Allocation Failures

For allocation or DEFINE failures, capture:

- IDCAMS return code
- VSAM catalog return code
- Reason code
- Volume space
- SMS ACS behavior
- SHAREOPTIONS
- LINEAR attribute
- Primary allocation
- Secondary allocation
- Catalog status

Generic example:

```text
NAME(HLQ.ZFS.FILESYS)
VOLUMES(VOL001)
LINEAR CYL(100 50)
SHAREOPTIONS(3)
```
