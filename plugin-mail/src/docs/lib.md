---
type: Rust Module
title: lib.rs
resource: plugin-mail/src/lib.rs
docgen:
  crc: pending
---

## Огляд

Домен `nitra:mail`: типи metadata-only, trait `MailHost`, `GrantGatedMailHost` для `mail:metadata.read` зі scope `message`. WIT — `wit/mail.wit`.

## Публічний API

- `MessageMetadata`, `MailHost`, `GrantGatedMailHost`, `MockMailHost`
- `scope_metadata_message`, `CAP_MAIL_METADATA_READ`
