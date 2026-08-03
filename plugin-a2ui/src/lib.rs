//! A2UI v1.0 Candidate adapter for nitra plugins.
//!
//! Vendors pinned schema files under `schemas/1.0/`, exposes [`SCHEMA_REV`],
//! validates agent→renderer message streams against the host catalog allowlist
//! (`nitra.core`), and keeps per-surface component/data state.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};

/// A2UI protocol version required for MVP (manifest `a2ui.protocol` maps to this).
pub const PROTOCOL: &str = "1.0";

/// Envelope `version` field in A2UI v1.0 messages.
pub const MESSAGE_VERSION: &str = "v1.0";

/// Host catalog id for the MVP Vue renderer.
pub const CATALOG_NITRA_CORE: &str = "nitra.core";

/// Official basic catalog id (accepted as alias when validating fixtures).
pub const CATALOG_A2UI_BASIC: &str =
    "https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json";

/// SHA-256 of concatenated vendored schema files (`agent_to_renderer` + `common_types` +
/// `basic_catalog`). Manifest `a2ui.schema_rev` must match this pin.
pub const SCHEMA_REV: &str = "ae2785521b33222f775bac50d080066bac110b4ab5214945c4d8c5bee6a35416";

/// Soft cap for a single validated message JSON (bytes of compact serialization).
pub const MAX_MESSAGE_BYTES: usize = 256 * 1024;

/// Soft cap for accumulated components on one surface.
pub const MAX_COMPONENTS_PER_SURFACE: usize = 256;

const OP_KEYS: &[&str] = &[
    "createSurface",
    "updateComponents",
    "updateDataModel",
    "deleteSurface",
    "callFunction",
    "actionResponse",
];

/// MVP allowlist: component name → allowed property keys (beyond `id`/`component`/`catalogId`).
fn nitra_core_props(component: &str) -> Option<&'static [&'static str]> {
    match component {
        "Text" => Some(&["text", "variant", "weight"]),
        "Column" => Some(&["children", "justify", "align", "weight"]),
        "Row" => Some(&["children", "justify", "align", "weight"]),
        "Button" => Some(&["child", "variant", "action", "weight"]),
        "Divider" => Some(&["axis", "weight"]),
        _ => None,
    }
}

/// Errors from A2UI validation / surface state.
#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum A2uiError {
    #[error("pin mismatch: expected schema_rev {expected}, got {got}")]
    PinMismatch { expected: String, got: String },
    #[error("protocol mismatch: expected {expected}, got {got}")]
    ProtocolMismatch { expected: String, got: String },
    #[error("invalid message: {0}")]
    Invalid(String),
    #[error("unknown catalog: {0}")]
    UnknownCatalog(String),
    #[error("unknown component: {0}")]
    UnknownComponent(String),
    #[error("unknown prop '{prop}' on {component}")]
    UnknownProp { component: String, prop: String },
    #[error("surface not found: {0}")]
    SurfaceNotFound(String),
    #[error("surface already exists: {0}")]
    SurfaceExists(String),
    #[error("payload too large ({size} > {max})")]
    TooLarge { size: usize, max: usize },
}

/// Check manifest pin against the vendored schema revision.
pub fn check_pin(protocol: &str, schema_rev: &str) -> Result<(), A2uiError> {
    if protocol != PROTOCOL {
        return Err(A2uiError::ProtocolMismatch {
            expected: PROTOCOL.into(),
            got: protocol.into(),
        });
    }
    if schema_rev != SCHEMA_REV {
        return Err(A2uiError::PinMismatch {
            expected: SCHEMA_REV.into(),
            got: schema_rev.into(),
        });
    }
    Ok(())
}

/// Recompute [`SCHEMA_REV`] from bytes (used in tests to guard vendor drift).
pub fn schema_rev_of(parts: &[&[u8]]) -> String {
    let mut hasher = Sha256::new();
    for p in parts {
        hasher.update(p);
    }
    hex::encode(hasher.finalize())
}

fn is_allowed_catalog(id: &str) -> bool {
    id == CATALOG_NITRA_CORE || id == CATALOG_A2UI_BASIC
}

fn message_op(msg: &Map<String, Value>) -> Result<&str, A2uiError> {
    let found: Vec<&str> = OP_KEYS
        .iter()
        .copied()
        .filter(|k| msg.contains_key(*k))
        .collect();
    match found.as_slice() {
        [one] => Ok(*one),
        [] => Err(A2uiError::Invalid("missing operation key".into())),
        _ => Err(A2uiError::Invalid(format!(
            "multiple operation keys: {found:?}"
        ))),
    }
}

fn require_version(msg: &Map<String, Value>) -> Result<(), A2uiError> {
    match msg.get("version").and_then(Value::as_str) {
        Some(MESSAGE_VERSION) => Ok(()),
        Some(other) => Err(A2uiError::Invalid(format!(
            "version must be {MESSAGE_VERSION}, got {other}"
        ))),
        None => Err(A2uiError::Invalid("missing version".into())),
    }
}

fn check_size(msg: &Value) -> Result<(), A2uiError> {
    let size = serde_json::to_vec(msg)
        .map_err(|e| A2uiError::Invalid(e.to_string()))?
        .len();
    if size > MAX_MESSAGE_BYTES {
        return Err(A2uiError::TooLarge {
            size,
            max: MAX_MESSAGE_BYTES,
        });
    }
    Ok(())
}

fn validate_component(comp: &Value, default_catalog: Option<&str>) -> Result<(), A2uiError> {
    let obj = comp
        .as_object()
        .ok_or_else(|| A2uiError::Invalid("component must be object".into()))?;
    let id = obj
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| A2uiError::Invalid("component.id required".into()))?;
    if id.is_empty() {
        return Err(A2uiError::Invalid("component.id empty".into()));
    }
    let name = obj
        .get("component")
        .and_then(Value::as_str)
        .ok_or_else(|| A2uiError::Invalid(format!("component.component required on {id}")))?;
    let catalog = obj
        .get("catalogId")
        .and_then(Value::as_str)
        .or(default_catalog)
        .unwrap_or(CATALOG_NITRA_CORE);
    if !is_allowed_catalog(catalog) {
        return Err(A2uiError::UnknownCatalog(catalog.into()));
    }
    // MVP host renderer only implements nitra.core; basic catalog id is accepted
    // only when components are within the nitra.core allowlist subset.
    let allowed = nitra_core_props(name).ok_or_else(|| A2uiError::UnknownComponent(name.into()))?;
    for key in obj.keys() {
        if matches!(
            key.as_str(),
            "id" | "component" | "catalogId" | "accessibility"
        ) {
            continue;
        }
        if !allowed.contains(&key.as_str()) {
            return Err(A2uiError::UnknownProp {
                component: name.into(),
                prop: key.clone(),
            });
        }
    }
    match name {
        "Text" if !obj.contains_key("text") => {
            Err(A2uiError::Invalid(format!("Text@{id} requires text")))
        }
        "Column" | "Row" if !obj.contains_key("children") => {
            Err(A2uiError::Invalid(format!("{name}@{id} requires children")))
        }
        "Button" if !(obj.contains_key("child") && obj.contains_key("action")) => Err(
            A2uiError::Invalid(format!("Button@{id} requires child and action")),
        ),
        _ => Ok(()),
    }
}

fn validate_components_list(
    components: &[Value],
    default_catalog: Option<&str>,
) -> Result<(), A2uiError> {
    if components.is_empty() {
        return Err(A2uiError::Invalid("components list empty".into()));
    }
    if components.len() > MAX_COMPONENTS_PER_SURFACE {
        return Err(A2uiError::TooLarge {
            size: components.len(),
            max: MAX_COMPONENTS_PER_SURFACE,
        });
    }
    let mut ids = BTreeSet::new();
    for c in components {
        validate_component(c, default_catalog)?;
        let id = c.get("id").and_then(Value::as_str).unwrap();
        if !ids.insert(id.to_string()) {
            return Err(A2uiError::Invalid(format!("duplicate component id {id}")));
        }
    }
    Ok(())
}

/// In-memory surface after applying a validated stream.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SurfaceState {
    pub surface_id: String,
    pub catalog_id: String,
    pub components: BTreeMap<String, Value>,
    pub data_model: Value,
}

impl SurfaceState {
    /// Adjacency component with `id == "root"`, if present.
    pub fn root(&self) -> Option<&Value> {
        self.components.get("root")
    }
}

/// Applies A2UI messages and retains surface ownership state.
#[derive(Debug, Default)]
pub struct SurfaceRegistry {
    surfaces: BTreeMap<String, SurfaceState>,
}

impl SurfaceRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get(&self, surface_id: &str) -> Option<&SurfaceState> {
        self.surfaces.get(surface_id)
    }

    pub fn surfaces(&self) -> impl Iterator<Item = &SurfaceState> {
        self.surfaces.values()
    }

    /// Validate and apply an ordered agent→renderer message list.
    pub fn apply_stream(&mut self, messages: &[Value]) -> Result<(), A2uiError> {
        for msg in messages {
            self.apply_message(msg)?;
        }
        Ok(())
    }

    pub fn apply_message(&mut self, msg: &Value) -> Result<(), A2uiError> {
        check_size(msg)?;
        let obj = msg
            .as_object()
            .ok_or_else(|| A2uiError::Invalid("message must be object".into()))?;
        require_version(obj)?;
        let op = message_op(obj)?;
        match op {
            "createSurface" => self.create_surface(obj),
            "updateComponents" => self.update_components(obj),
            "updateDataModel" => self.update_data_model(obj),
            "deleteSurface" => self.delete_surface(obj),
            "callFunction" | "actionResponse" => {
                // Accepted structurally for pin/protocol; MVP host ignores execution.
                Ok(())
            }
            other => Err(A2uiError::Invalid(format!("unsupported op {other}"))),
        }
    }

    fn create_surface(&mut self, msg: &Map<String, Value>) -> Result<(), A2uiError> {
        let body = msg
            .get("createSurface")
            .and_then(Value::as_object)
            .ok_or_else(|| A2uiError::Invalid("createSurface body".into()))?;
        let surface_id = body
            .get("surfaceId")
            .and_then(Value::as_str)
            .ok_or_else(|| A2uiError::Invalid("createSurface.surfaceId".into()))?
            .to_string();
        if self.surfaces.contains_key(&surface_id) {
            return Err(A2uiError::SurfaceExists(surface_id));
        }
        let catalog_id = body
            .get("catalogId")
            .and_then(Value::as_str)
            .unwrap_or(CATALOG_NITRA_CORE)
            .to_string();
        if !is_allowed_catalog(&catalog_id) {
            return Err(A2uiError::UnknownCatalog(catalog_id));
        }
        let mut components = BTreeMap::new();
        if let Some(list) = body.get("components") {
            let arr = list
                .as_array()
                .ok_or_else(|| A2uiError::Invalid("components must be array".into()))?;
            validate_components_list(arr, Some(&catalog_id))?;
            for c in arr {
                let id = c.get("id").and_then(Value::as_str).unwrap().to_string();
                components.insert(id, c.clone());
            }
        }
        let data_model = body
            .get("dataModel")
            .cloned()
            .unwrap_or_else(|| Value::Object(Map::new()));
        self.surfaces.insert(
            surface_id.clone(),
            SurfaceState {
                surface_id,
                catalog_id,
                components,
                data_model,
            },
        );
        Ok(())
    }

    fn update_components(&mut self, msg: &Map<String, Value>) -> Result<(), A2uiError> {
        let body = msg
            .get("updateComponents")
            .and_then(Value::as_object)
            .ok_or_else(|| A2uiError::Invalid("updateComponents body".into()))?;
        let surface_id = body
            .get("surfaceId")
            .and_then(Value::as_str)
            .ok_or_else(|| A2uiError::Invalid("updateComponents.surfaceId".into()))?;
        let surface = self
            .surfaces
            .get_mut(surface_id)
            .ok_or_else(|| A2uiError::SurfaceNotFound(surface_id.into()))?;
        let arr = body
            .get("components")
            .and_then(Value::as_array)
            .ok_or_else(|| A2uiError::Invalid("updateComponents.components".into()))?;
        validate_components_list(arr, Some(&surface.catalog_id))?;
        if surface.components.len() + arr.len() > MAX_COMPONENTS_PER_SURFACE {
            return Err(A2uiError::TooLarge {
                size: surface.components.len() + arr.len(),
                max: MAX_COMPONENTS_PER_SURFACE,
            });
        }
        for c in arr {
            let id = c.get("id").and_then(Value::as_str).unwrap().to_string();
            surface.components.insert(id, c.clone());
        }
        Ok(())
    }

    fn update_data_model(&mut self, msg: &Map<String, Value>) -> Result<(), A2uiError> {
        let body = msg
            .get("updateDataModel")
            .and_then(Value::as_object)
            .ok_or_else(|| A2uiError::Invalid("updateDataModel body".into()))?;
        let surface_id = body
            .get("surfaceId")
            .and_then(Value::as_str)
            .ok_or_else(|| A2uiError::Invalid("updateDataModel.surfaceId".into()))?;
        let surface = self
            .surfaces
            .get_mut(surface_id)
            .ok_or_else(|| A2uiError::SurfaceNotFound(surface_id.into()))?;
        if !body.contains_key("value") {
            return Err(A2uiError::Invalid("updateDataModel.value required".into()));
        }
        let path = body.get("path").and_then(Value::as_str).unwrap_or("/");
        let value = body.get("value").cloned().unwrap();
        if path == "/" || path.is_empty() {
            surface.data_model = value;
        } else {
            // MVP: only root replace; nested paths rejected to avoid silent partial writes.
            return Err(A2uiError::Invalid(
                "MVP updateDataModel supports only path \"/\"".into(),
            ));
        }
        Ok(())
    }

    fn delete_surface(&mut self, msg: &Map<String, Value>) -> Result<(), A2uiError> {
        let body = msg
            .get("deleteSurface")
            .and_then(Value::as_object)
            .ok_or_else(|| A2uiError::Invalid("deleteSurface body".into()))?;
        let surface_id = body
            .get("surfaceId")
            .and_then(Value::as_str)
            .ok_or_else(|| A2uiError::Invalid("deleteSurface.surfaceId".into()))?;
        if self.surfaces.remove(surface_id).is_none() {
            return Err(A2uiError::SurfaceNotFound(surface_id.into()));
        }
        Ok(())
    }
}

/// Validate a stream without retaining state beyond the call (returns final surfaces).
pub fn validate_stream(messages: &[Value]) -> Result<SurfaceRegistry, A2uiError> {
    let mut reg = SurfaceRegistry::new();
    reg.apply_stream(messages)?;
    Ok(reg)
}

/// Sample sidebar stream used by contract tests and mlmail demo surface.
pub fn sample_sidebar_stream() -> Vec<Value> {
    serde_json::from_str(include_str!("../fixtures/sidebar_sample.json")).expect("fixture json")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn schema_rev_matches_vendored_files() {
        let a = include_bytes!("../schemas/1.0/agent_to_renderer.json");
        let b = include_bytes!("../schemas/1.0/common_types.json");
        let c = include_bytes!("../schemas/1.0/basic_catalog.json");
        assert_eq!(schema_rev_of(&[a, b, c]), SCHEMA_REV);
    }

    #[test]
    fn pin_accepts_exact_rev() {
        check_pin(PROTOCOL, SCHEMA_REV).unwrap();
    }

    #[test]
    fn pin_rejects_mismatch() {
        let err = check_pin(PROTOCOL, "deadbeef").unwrap_err();
        assert!(matches!(err, A2uiError::PinMismatch { .. }));
        let err = check_pin("0.9", SCHEMA_REV).unwrap_err();
        assert!(matches!(err, A2uiError::ProtocolMismatch { .. }));
    }

    #[test]
    fn sample_sidebar_validates() {
        let reg = validate_stream(&sample_sidebar_stream()).unwrap();
        let s = reg.get("sidebar.draft-helper").unwrap();
        assert_eq!(s.catalog_id, CATALOG_NITRA_CORE);
        assert!(s.root().is_some());
        assert!(s.components.contains_key("title"));
    }

    #[test]
    fn rejects_unknown_catalog() {
        let msgs = vec![json!({
            "version": "v1.0",
            "createSurface": {
                "surfaceId": "s1",
                "catalogId": "evil.catalog",
                "components": [
                    {"id": "root", "component": "Text", "text": "x"}
                ]
            }
        })];
        let err = validate_stream(&msgs).unwrap_err();
        assert!(matches!(err, A2uiError::UnknownCatalog(_)));
    }

    #[test]
    fn rejects_unknown_component() {
        let msgs = vec![json!({
            "version": "v1.0",
            "createSurface": {
                "surfaceId": "s1",
                "catalogId": "nitra.core",
                "components": [
                    {"id": "root", "component": "WebView", "url": "https://evil"}
                ]
            }
        })];
        let err = validate_stream(&msgs).unwrap_err();
        assert!(matches!(err, A2uiError::UnknownComponent(_)));
    }

    #[test]
    fn rejects_unknown_prop() {
        let msgs = vec![json!({
            "version": "v1.0",
            "createSurface": {
                "surfaceId": "s1",
                "catalogId": "nitra.core",
                "components": [
                    {"id": "root", "component": "Text", "text": "hi", "innerHTML": "<b>x</b>"}
                ]
            }
        })];
        let err = validate_stream(&msgs).unwrap_err();
        assert!(matches!(err, A2uiError::UnknownProp { .. }));
    }

    #[test]
    fn rejects_duplicate_create() {
        let mut reg = SurfaceRegistry::new();
        reg.apply_stream(&sample_sidebar_stream()).unwrap();
        let err = reg.apply_stream(&sample_sidebar_stream()).unwrap_err();
        assert!(matches!(err, A2uiError::SurfaceExists(_)));
    }

    #[test]
    fn update_before_create_fails() {
        let msgs = vec![json!({
            "version": "v1.0",
            "updateComponents": {
                "surfaceId": "missing",
                "components": [{"id": "root", "component": "Text", "text": "x"}]
            }
        })];
        let err = validate_stream(&msgs).unwrap_err();
        assert!(matches!(err, A2uiError::SurfaceNotFound(_)));
    }
}
