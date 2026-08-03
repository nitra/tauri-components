//! Capability grants and local publisher trust (TOFU) for nitra plugins.
//!
//! Release hosts only accept packages whose Ed25519 public key is already trusted
//! or newly accepted via trust-on-first-use. Grants are keyed by plugin id,
//! capability, and scope — they survive version bumps until escalation.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Errors for trust store and grant persistence.
#[derive(Debug, thiserror::Error)]
pub enum PermissionsError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    #[error("untrusted publisher key: {0}")]
    Untrusted(String),
    #[error("denied: {0}")]
    Denied(String),
}

/// Formal scope attached to a capability grant.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct Scope {
    pub capability: String,
    pub resource_kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resource_id: Option<String>,
}

/// Persisted user grant for a plugin capability+scope.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Grant {
    pub plugin_id: String,
    pub user_id: String,
    pub scope: Scope,
    pub granted_at_unix: u64,
}

/// Trusted publisher public key entry.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TrustedKey {
    pub publisher_key_id: String,
    pub publisher: String,
    /// Hex-encoded Ed25519 verifying key (32 bytes).
    pub public_key_hex: String,
    pub trusted_at_unix: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct TrustStoreFile {
    keys: BTreeMap<String, TrustedKey>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct GrantStoreFile {
    grants: Vec<Grant>,
}

/// On-disk TOFU trust store for publisher verifying keys.
#[derive(Debug, Clone)]
pub struct TrustStore {
    path: PathBuf,
    data: TrustStoreFile,
}

impl TrustStore {
    /// Load from `trust-store.json` or create empty.
    pub fn open(path: impl Into<PathBuf>) -> Result<Self, PermissionsError> {
        let path = path.into();
        let data = if path.exists() {
            serde_json::from_str(&fs::read_to_string(&path)?)?
        } else {
            TrustStoreFile::default()
        };
        Ok(Self { path, data })
    }

    /// Look up a trusted key by publisher key id.
    pub fn get(&self, publisher_key_id: &str) -> Option<&TrustedKey> {
        self.data.keys.get(publisher_key_id)
    }

    /// Whether the key id is already trusted.
    pub fn is_trusted(&self, publisher_key_id: &str) -> bool {
        self.data.keys.contains_key(publisher_key_id)
    }

    /// TOFU accept: store public key after user confirmation.
    pub fn trust(
        &mut self,
        publisher_key_id: impl Into<String>,
        publisher: impl Into<String>,
        public_key_hex: impl Into<String>,
        trusted_at_unix: u64,
    ) -> Result<(), PermissionsError> {
        let publisher_key_id = publisher_key_id.into();
        let entry = TrustedKey {
            publisher_key_id: publisher_key_id.clone(),
            publisher: publisher.into(),
            public_key_hex: public_key_hex.into(),
            trusted_at_unix,
        };
        if let Some(existing) = self.data.keys.get(&publisher_key_id) {
            if existing.public_key_hex != entry.public_key_hex {
                return Err(PermissionsError::Denied(format!(
                    "publisher_key_id {publisher_key_id} already trusted with a different public key; re-consent required"
                )));
            }
            return Ok(());
        }
        self.data.keys.insert(publisher_key_id, entry);
        self.save()
    }

    /// Require an already-trusted key (release install without TOFU prompt).
    pub fn require_trusted(&self, publisher_key_id: &str) -> Result<&TrustedKey, PermissionsError> {
        self.get(publisher_key_id)
            .ok_or_else(|| PermissionsError::Untrusted(publisher_key_id.to_string()))
    }

    fn save(&self) -> Result<(), PermissionsError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, serde_json::to_string_pretty(&self.data)?)?;
        Ok(())
    }
}

/// Local grant store keyed by plugin id + scope (survives version bumps).
#[derive(Debug, Clone)]
pub struct GrantStore {
    path: PathBuf,
    data: GrantStoreFile,
}

impl GrantStore {
    /// Load grants from JSON or start empty.
    pub fn open(path: impl Into<PathBuf>) -> Result<Self, PermissionsError> {
        let path = path.into();
        let data = if path.exists() {
            serde_json::from_str(&fs::read_to_string(&path)?)?
        } else {
            GrantStoreFile::default()
        };
        Ok(Self { path, data })
    }

    /// Persist a grant (idempotent for same plugin/user/scope).
    pub fn grant(&mut self, grant: Grant) -> Result<(), PermissionsError> {
        if !self.has(&grant.plugin_id, &grant.user_id, &grant.scope) {
            self.data.grants.push(grant);
            self.save()?;
        }
        Ok(())
    }

    /// Check whether a grant exists.
    pub fn has(&self, plugin_id: &str, user_id: &str, scope: &Scope) -> bool {
        self.data
            .grants
            .iter()
            .any(|g| g.plugin_id == plugin_id && g.user_id == user_id && g.scope == *scope)
    }

    /// Deny-by-default check used on WIT import boundaries.
    pub fn check(
        &self,
        plugin_id: &str,
        user_id: &str,
        scope: &Scope,
    ) -> Result<(), PermissionsError> {
        if self.has(plugin_id, user_id, scope) {
            Ok(())
        } else {
            Err(PermissionsError::Denied(format!(
                "{plugin_id} lacks {} on {}:{:?}",
                scope.capability, scope.resource_kind, scope.resource_id
            )))
        }
    }

    /// Remove all grants for a plugin (uninstall purge).
    pub fn purge_plugin(&mut self, plugin_id: &str) -> Result<(), PermissionsError> {
        self.data.grants.retain(|g| g.plugin_id != plugin_id);
        self.save()
    }

    fn save(&self) -> Result<(), PermissionsError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, serde_json::to_string_pretty(&self.data)?)?;
        Ok(())
    }
}

/// Convenience: fingerprint hex for UI TOFU display (first 16 hex chars).
pub fn fingerprint_preview(public_key_hex: &str) -> String {
    public_key_hex.chars().take(16).collect()
}

/// Resolve default trust-store path under an app-data root.
pub fn trust_store_path(app_data: &Path) -> PathBuf {
    app_data.join("plugins").join("trust-store.json")
}

/// Resolve default grant-store path under an app-data root.
pub fn grant_store_path(app_data: &Path) -> PathBuf {
    app_data.join("plugins").join("grants.json")
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn tofu_trust_and_mismatch() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("trust.json");
        let mut store = TrustStore::open(&path).unwrap();
        store.trust("k1", "example", "aa".repeat(32), 1).unwrap();
        assert!(store.is_trusted("k1"));
        let err = store
            .trust("k1", "example", "bb".repeat(32), 2)
            .unwrap_err();
        assert!(err.to_string().contains("different public key"));
    }

    #[test]
    fn grants_survive_and_purge() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("grants.json");
        let mut store = GrantStore::open(&path).unwrap();
        let scope = Scope {
            capability: "mail:metadata.read".into(),
            resource_kind: "message".into(),
            resource_id: Some("m1".into()),
        };
        store
            .grant(Grant {
                plugin_id: "com.example.x".into(),
                user_id: "u1".into(),
                scope: scope.clone(),
                granted_at_unix: 1,
            })
            .unwrap();
        store.check("com.example.x", "u1", &scope).unwrap();
        store.purge_plugin("com.example.x").unwrap();
        assert!(store.check("com.example.x", "u1", &scope).is_err());
    }
}
