//! Parse and validate `plugin.toml` for `.nitra-plugin` packages.
//!
//! Host install rejects manifests that fail structural or SemVer range checks
//! before archive contents are copied into the local registry.

use std::collections::BTreeSet;
use std::fs;
use std::path::Path;

use semver::{Version, VersionReq};
use serde::{Deserialize, Serialize};

/// Errors while reading or validating a plugin manifest.
#[derive(Debug, thiserror::Error)]
pub enum ManifestError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("toml parse: {0}")]
    Toml(#[from] toml::de::Error),
    #[error("invalid manifest: {0}")]
    Invalid(String),
    #[error("incompatible requirement {name}: plugin wants {wanted}, host provides {have}")]
    Incompatible {
        name: String,
        wanted: String,
        have: String,
    },
}

/// Declared A2UI protocol pin from the plugin package.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct A2uiPin {
    /// Protocol major line, e.g. `"1.0"`.
    pub protocol: String,
    /// Pinned schema revision hash or date stamp.
    pub schema_rev: String,
}

/// One capability the plugin may request at install time.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CapabilityDecl {
    pub name: String,
    #[serde(default)]
    pub resource_kinds: Vec<String>,
}

/// Host UI surface the plugin wants to register.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SurfaceDecl {
    pub id: String,
    pub kind: String,
}

/// Required API ranges (`platform`, `nitra:mail`, …).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct Requires {
    #[serde(default)]
    pub platform: Option<String>,
    #[serde(flatten)]
    pub domains: std::collections::BTreeMap<String, String>,
}

/// Parsed `plugin.toml`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub publisher: String,
    pub publisher_key_id: String,
    pub a2ui: A2uiPin,
    #[serde(default)]
    pub requires: Requires,
    #[serde(default)]
    pub capabilities: Vec<CapabilityDecl>,
    #[serde(default)]
    pub surfaces: Vec<SurfaceDecl>,
}

impl PluginManifest {
    /// Parse TOML text into a validated manifest.
    pub fn parse(toml_text: &str) -> Result<Self, ManifestError> {
        let manifest: Self = toml::from_str(toml_text)?;
        manifest.validate()?;
        Ok(manifest)
    }

    /// Read and parse `plugin.toml` from disk.
    pub fn from_path(path: &Path) -> Result<Self, ManifestError> {
        let text = fs::read_to_string(path)?;
        Self::parse(&text)
    }

    /// Structural validation (ids, SemVer, A2UI pin, uniqueness).
    pub fn validate(&self) -> Result<(), ManifestError> {
        if self.id.trim().is_empty() {
            return Err(ManifestError::Invalid("id is empty".into()));
        }
        if self.id.contains(['/', '\\', ' ']) {
            return Err(ManifestError::Invalid(
                "id must not contain spaces or path separators".into(),
            ));
        }
        Version::parse(&self.version)
            .map_err(|e| ManifestError::Invalid(format!("version must be SemVer: {e}")))?;
        if self.publisher.trim().is_empty() {
            return Err(ManifestError::Invalid("publisher is empty".into()));
        }
        if self.publisher_key_id.trim().is_empty() {
            return Err(ManifestError::Invalid("publisher_key_id is empty".into()));
        }
        if self.a2ui.protocol != "1.0" {
            return Err(ManifestError::Invalid(format!(
                "a2ui.protocol must be \"1.0\" for MVP, got {}",
                self.a2ui.protocol
            )));
        }
        if self.a2ui.schema_rev.trim().is_empty() {
            return Err(ManifestError::Invalid("a2ui.schema_rev is empty".into()));
        }
        if let Some(platform) = &self.requires.platform {
            VersionReq::parse(platform)
                .map_err(|e| ManifestError::Invalid(format!("requires.platform: {e}")))?;
        }
        for (name, req) in &self.requires.domains {
            VersionReq::parse(req)
                .map_err(|e| ManifestError::Invalid(format!("requires.{name}: {e}")))?;
        }
        let mut caps = BTreeSet::new();
        for cap in &self.capabilities {
            if !caps.insert(cap.name.clone()) {
                return Err(ManifestError::Invalid(format!(
                    "duplicate capability {}",
                    cap.name
                )));
            }
            if cap.name == "mail:content.read" && cap.resource_kinds.iter().any(|k| k == "account")
            {
                return Err(ManifestError::Invalid(
                    "mail:content.read with resource_kind account is not allowed in MVP".into(),
                ));
            }
        }
        let mut surfaces = BTreeSet::new();
        for surface in &self.surfaces {
            if !surfaces.insert(surface.id.clone()) {
                return Err(ManifestError::Invalid(format!(
                    "duplicate surface {}",
                    surface.id
                )));
            }
        }
        Ok(())
    }

    /// Check SemVer ranges against host-provided versions.
    pub fn check_compatibility(
        &self,
        host_platform: &Version,
        host_domains: &[(impl AsRef<str>, &Version)],
    ) -> Result<(), ManifestError> {
        if let Some(req_str) = &self.requires.platform {
            let req = VersionReq::parse(req_str)
                .map_err(|e| ManifestError::Invalid(format!("requires.platform: {e}")))?;
            if !req.matches(host_platform) {
                return Err(ManifestError::Incompatible {
                    name: "platform".into(),
                    wanted: req_str.clone(),
                    have: host_platform.to_string(),
                });
            }
        }
        for (domain, have) in host_domains {
            let name = domain.as_ref();
            let Some(req_str) = self.requires.domains.get(name) else {
                continue;
            };
            let req = VersionReq::parse(req_str)
                .map_err(|e| ManifestError::Invalid(format!("requires.{name}: {e}")))?;
            if !req.matches(have) {
                return Err(ManifestError::Incompatible {
                    name: name.to_string(),
                    wanted: req_str.clone(),
                    have: have.to_string(),
                });
            }
        }
        for name in self.requires.domains.keys() {
            if name == "platform" {
                continue;
            }
            if !host_domains.iter().any(|(d, _)| d.as_ref() == name) {
                return Err(ManifestError::Incompatible {
                    name: name.clone(),
                    wanted: self.requires.domains[name].clone(),
                    have: "missing".into(),
                });
            }
        }
        Ok(())
    }

    /// Parsed plugin SemVer.
    pub fn semver(&self) -> Result<Version, ManifestError> {
        Version::parse(&self.version).map_err(|e| ManifestError::Invalid(format!("version: {e}")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_toml() -> &'static str {
        r#"
id = "com.example.mail-draft-helper"
name = "Draft Helper"
version = "0.1.0"
publisher = "example"
publisher_key_id = "ext_example_2026"

[a2ui]
protocol = "1.0"
schema_rev = "testhash"

[requires]
platform = "^0.1"
"nitra:mail" = "^0.1"

[[capabilities]]
name = "mail:metadata.read"
resource_kinds = ["message"]

[[capabilities]]
name = "mail:draft.create"
resource_kinds = ["account"]

[[surfaces]]
id = "sidebar.draft-helper"
kind = "sidebar"
"#
    }

    #[test]
    fn parses_valid_manifest() {
        let m = PluginManifest::parse(sample_toml()).unwrap();
        assert_eq!(m.id, "com.example.mail-draft-helper");
        assert_eq!(m.a2ui.protocol, "1.0");
        assert_eq!(m.capabilities.len(), 2);
        assert_eq!(m.requires.domains.get("nitra:mail").unwrap(), "^0.1");
    }

    #[test]
    fn rejects_account_content_read() {
        let toml = r#"
id = "com.example.x"
name = "X"
version = "0.1.0"
publisher = "example"
publisher_key_id = "k1"
[a2ui]
protocol = "1.0"
schema_rev = "h"
[[capabilities]]
name = "mail:content.read"
resource_kinds = ["account"]
"#;
        let err = PluginManifest::parse(toml).unwrap_err();
        assert!(err.to_string().contains("account"));
    }

    #[test]
    fn compatibility_ok_and_fail() {
        let m = PluginManifest::parse(sample_toml()).unwrap();
        let platform = Version::parse("0.1.2").unwrap();
        let mail = Version::parse("0.1.0").unwrap();
        m.check_compatibility(&platform, &[("nitra:mail", &mail)])
            .unwrap();

        let old = Version::parse("0.0.1").unwrap();
        let err = m
            .check_compatibility(&old, &[("nitra:mail", &mail)])
            .unwrap_err();
        assert!(matches!(err, ManifestError::Incompatible { .. }));
    }
}
