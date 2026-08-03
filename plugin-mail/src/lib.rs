//! `nitra:mail` domain types and grant-gated mail host (M3–M5).
//!
//! Product hosts (e.g. `mlmail-plugin-host`) implement [`MailHost`]. Plugins
//! never see arbitrary HTTP — only [`MessageMetadata`] and [`DraftCreateResult`].
//! Capabilities are enforced by [`GrantGatedMailHost`] before any inner call.

use std::sync::{Arc, Mutex};

use plugin_permissions::{GrantStore, PermissionsError, Scope};
use serde::{Deserialize, Serialize};

/// Capability name for read-only message metadata.
pub const CAP_MAIL_METADATA_READ: &str = "mail:metadata.read";

/// Capability name for creating a draft (mutating → audit in host).
pub const CAP_MAIL_DRAFT_CREATE: &str = "mail:draft.create";

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

/// Request to create a draft under an account scope.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DraftCreateRequest {
    pub account_id: String,
    pub to: String,
    pub subject: String,
    pub body: String,
}

/// Result of a successful draft create (id only — no body in audit).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DraftCreateResult {
    pub draft_id: String,
}

/// Product-provided mail backend (Gmail, mock, …).
pub trait MailHost: Send + Sync {
    fn get_message_metadata(&self, message_id: &str) -> Result<MessageMetadata, MailError>;

    /// Create a draft. Host must enforce `mail:draft.create` + account scope.
    fn create_draft(&self, req: &DraftCreateRequest) -> Result<DraftCreateResult, MailError>;
}

/// Scope helper for `mail:metadata.read` on a concrete message.
pub fn scope_metadata_message(message_id: &str) -> Scope {
    Scope {
        capability: CAP_MAIL_METADATA_READ.to_string(),
        resource_kind: "message".to_string(),
        resource_id: Some(message_id.to_string()),
    }
}

/// Scope helper for `mail:draft.create` on an account.
pub fn scope_draft_account(account_id: &str) -> Scope {
    Scope {
        capability: CAP_MAIL_DRAFT_CREATE.to_string(),
        resource_kind: "account".to_string(),
        resource_id: Some(account_id.to_string()),
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

    fn create_draft(&self, req: &DraftCreateRequest) -> Result<DraftCreateResult, MailError> {
        let scope = scope_draft_account(&req.account_id);
        {
            let grants = self.grants.lock().expect("grants mutex");
            grants.check(&self.plugin_id, &self.user_id, &scope)?;
        }
        self.inner.create_draft(req)
    }
}

/// In-memory mock for platform tests.
#[derive(Debug, Default, Clone)]
pub struct MockMailHost {
    pub messages: Vec<MessageMetadata>,
    pub drafts: Arc<Mutex<Vec<DraftCreateRequest>>>,
}

impl MailHost for MockMailHost {
    fn get_message_metadata(&self, message_id: &str) -> Result<MessageMetadata, MailError> {
        self.messages
            .iter()
            .find(|m| m.id == message_id)
            .cloned()
            .ok_or_else(|| MailError::NotFound(message_id.to_string()))
    }

    fn create_draft(&self, req: &DraftCreateRequest) -> Result<DraftCreateResult, MailError> {
        let mut drafts = self.drafts.lock().expect("drafts mutex");
        let draft_id = format!("draft_{}", drafts.len() + 1);
        drafts.push(req.clone());
        Ok(DraftCreateResult { draft_id })
    }
}

/// Serialize metadata as compact JSON for the core-Wasm string ABI.
pub fn metadata_to_json(meta: &MessageMetadata) -> Result<String, MailError> {
    serde_json::to_string(meta).map_err(|e| MailError::Other(e.to_string()))
}

/// Serialize a draft request for the core-Wasm string ABI.
pub fn draft_request_to_json(req: &DraftCreateRequest) -> Result<String, MailError> {
    serde_json::to_string(req).map_err(|e| MailError::Other(e.to_string()))
}

/// Serialize a draft result for the core-Wasm string ABI.
pub fn draft_result_to_json(result: &DraftCreateResult) -> Result<String, MailError> {
    serde_json::to_string(result).map_err(|e| MailError::Other(e.to_string()))
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

    fn sample_draft() -> DraftCreateRequest {
        DraftCreateRequest {
            account_id: "acct_1".into(),
            to: "b@example.com".into(),
            subject: "Re: Hello".into(),
            body: "Thanks".into(),
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
            ..Default::default()
        };
        let host = GrantGatedMailHost::new(inner, grants, "com.example.p", "user1");
        let err = host.get_message_metadata("msg_1").unwrap_err();
        assert!(matches!(err, MailError::Denied(_)));
        let err = host.create_draft(&sample_draft()).unwrap_err();
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
            ..Default::default()
        };
        let host = GrantGatedMailHost::new(inner, Arc::clone(&grants), "com.example.p", "user1");
        let meta = host.get_message_metadata("msg_1").unwrap();
        assert_eq!(meta.subject, "Hello");
        assert!(matches!(
            host.get_message_metadata("msg_2").unwrap_err(),
            MailError::Denied(_)
        ));
    }

    #[test]
    fn grant_gate_allows_draft_with_account_scope() {
        let dir = tempdir().unwrap();
        let grants = Arc::new(Mutex::new(
            GrantStore::open(dir.path().join("grants.json")).unwrap(),
        ));
        {
            let mut g = grants.lock().unwrap();
            g.grant(Grant {
                plugin_id: "com.example.p".into(),
                user_id: "user1".into(),
                scope: scope_draft_account("acct_1"),
                granted_at_unix: 1,
            })
            .unwrap();
        }
        let inner = MockMailHost::default();
        let host = GrantGatedMailHost::new(inner, Arc::clone(&grants), "com.example.p", "user1");
        let result = host.create_draft(&sample_draft()).unwrap();
        assert_eq!(result.draft_id, "draft_1");
        let wrong = DraftCreateRequest {
            account_id: "acct_2".into(),
            ..sample_draft()
        };
        assert!(matches!(
            host.create_draft(&wrong).unwrap_err(),
            MailError::Denied(_)
        ));
    }
}
