//! `nitra:mail` domain types and grant-gated metadata host (M3).
//!
//! Product hosts (e.g. `mlmail-plugin-host`) implement [`MailHost`]. Plugins
//! never see body/HTML — only [`MessageMetadata`]. Capability
//! `mail:metadata.read` with `resource_kind = "message"` is enforced by
//! [`GrantGatedMailHost`] before any inner call.

use std::sync::{Arc, Mutex};

use plugin_permissions::{GrantStore, PermissionsError, Scope};
use serde::{Deserialize, Serialize};

/// Capability name for read-only message metadata.
pub const CAP_MAIL_METADATA_READ: &str = "mail:metadata.read";

/// Errors from mail host operations.
#[derive(Debug, thiserror::Error)]
pub enum MailError {
    #[error("denied: {0}")]
    Denied(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("unavailable: {0}")]
    Unavailable(String),
    #[error("{0}")]
    Other(String),
}

impl From<PermissionsError> for MailError {
    fn from(value: PermissionsError) -> Self {
        match value {
            PermissionsError::Denied(msg) => MailError::Denied(msg),
            other => MailError::Other(other.to_string()),
        }
    }
}

/// Metadata-only message view (no body). Aligns with `wit/mail.wit`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MessageMetadata {
    pub id: String,
    pub from: String,
    pub subject: String,
    pub date: String,
}

/// Product-provided mail backend (Gmail, mock, …).
pub trait MailHost: Send + Sync {
    fn get_message_metadata(&self, message_id: &str) -> Result<MessageMetadata, MailError>;
}

/// Scope helper for `mail:metadata.read` on a concrete message.
pub fn scope_metadata_message(message_id: &str) -> Scope {
    Scope {
        capability: CAP_MAIL_METADATA_READ.to_string(),
        resource_kind: "message".to_string(),
        resource_id: Some(message_id.to_string()),
    }
}

/// Wraps an inner [`MailHost`] with deny-by-default grant checks.
pub struct GrantGatedMailHost<H> {
    inner: H,
    grants: Arc<Mutex<GrantStore>>,
    plugin_id: String,
    user_id: String,
}

impl<H> GrantGatedMailHost<H> {
    pub fn new(
        inner: H,
        grants: Arc<Mutex<GrantStore>>,
        plugin_id: impl Into<String>,
        user_id: impl Into<String>,
    ) -> Self {
        Self {
            inner,
            grants,
            plugin_id: plugin_id.into(),
            user_id: user_id.into(),
        }
    }

    pub fn plugin_id(&self) -> &str {
        &self.plugin_id
    }

    pub fn user_id(&self) -> &str {
        &self.user_id
    }
}

impl<H: MailHost> MailHost for GrantGatedMailHost<H> {
    fn get_message_metadata(&self, message_id: &str) -> Result<MessageMetadata, MailError> {
        let scope = scope_metadata_message(message_id);
        {
            let grants = self.grants.lock().expect("grants mutex");
            grants.check(&self.plugin_id, &self.user_id, &scope)?;
        }
        self.inner.get_message_metadata(message_id)
    }
}

/// In-memory mock for platform tests.
#[derive(Debug, Default, Clone)]
pub struct MockMailHost {
    pub messages: Vec<MessageMetadata>,
}

impl MailHost for MockMailHost {
    fn get_message_metadata(&self, message_id: &str) -> Result<MessageMetadata, MailError> {
        self.messages
            .iter()
            .find(|m| m.id == message_id)
            .cloned()
            .ok_or_else(|| MailError::NotFound(message_id.to_string()))
    }
}

/// Serialize metadata as compact JSON for the core-Wasm string ABI.
pub fn metadata_to_json(meta: &MessageMetadata) -> Result<String, MailError> {
    serde_json::to_string(meta).map_err(|e| MailError::Other(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use plugin_permissions::Grant;
    use tempfile::tempdir;

    fn sample_meta() -> MessageMetadata {
        MessageMetadata {
            id: "msg_1".into(),
            from: "a@example.com".into(),
            subject: "Hello".into(),
            date: "2026-08-03".into(),
        }
    }

    #[test]
    fn grant_gate_denies_without_grant() {
        let dir = tempdir().unwrap();
        let grants = Arc::new(Mutex::new(
            GrantStore::open(dir.path().join("grants.json")).unwrap(),
        ));
        let inner = MockMailHost {
            messages: vec![sample_meta()],
        };
        let host = GrantGatedMailHost::new(inner, grants, "com.example.p", "user1");
        let err = host.get_message_metadata("msg_1").unwrap_err();
        assert!(matches!(err, MailError::Denied(_)));
    }

    #[test]
    fn grant_gate_allows_with_message_scope() {
        let dir = tempdir().unwrap();
        let grants = Arc::new(Mutex::new(
            GrantStore::open(dir.path().join("grants.json")).unwrap(),
        ));
        {
            let mut g = grants.lock().unwrap();
            g.grant(Grant {
                plugin_id: "com.example.p".into(),
                user_id: "user1".into(),
                scope: scope_metadata_message("msg_1"),
                granted_at_unix: 1,
            })
            .unwrap();
        }
        let inner = MockMailHost {
            messages: vec![sample_meta()],
        };
        let host = GrantGatedMailHost::new(inner, Arc::clone(&grants), "com.example.p", "user1");
        let meta = host.get_message_metadata("msg_1").unwrap();
        assert_eq!(meta.subject, "Hello");
        // different message still denied
        assert!(matches!(
            host.get_message_metadata("msg_2").unwrap_err(),
            MailError::Denied(_)
        ));
    }
}
