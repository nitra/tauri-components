//! Core-Wasm ABI bridging `nitra_mail.get_metadata` → [`plugin_mail::MailHost`].
//!
//! Import signature:
//! `get_metadata(id_ptr, id_len, out_ptr, out_cap) -> i32`
//! - `>= 0` — bytes written to `out_ptr`
//! - `-1` — denied (no grant)
//! - `-2` — not found / host error
//! - `-3` — output buffer too small

use plugin_mail::{metadata_to_json, MailError, MessageMetadata};
use wasmtime::{Caller, Extern, Linker, Memory};

use crate::{HostState, RuntimeError};

pub const MAIL_IMPORT_MODULE: &str = "nitra_mail";
pub const MAIL_IMPORT_FUNC: &str = "get_metadata";

/// Return codes for the core-Wasm ABI.
pub const ABI_DENIED: i32 = -1;
pub const ABI_ERROR: i32 = -2;
pub const ABI_OVERFLOW: i32 = -3;

pub(crate) fn define_mail_imports(linker: &mut Linker<HostState>) -> Result<(), RuntimeError> {
    linker.func_wrap(
        MAIL_IMPORT_MODULE,
        MAIL_IMPORT_FUNC,
        |mut caller: Caller<'_, HostState>,
         id_ptr: i32,
         id_len: i32,
         out_ptr: i32,
         out_cap: i32|
         -> i32 {
            let Some(mail) = caller.data().mail.clone() else {
                return ABI_ERROR;
            };
            let Some(ExtMem(mem)) = memory_export(&mut caller) else {
                return ABI_ERROR;
            };
            if id_len < 0 || out_cap < 0 {
                return ABI_ERROR;
            }
            let id_len = id_len as usize;
            let out_cap = out_cap as usize;
            let mut id_buf = vec![0u8; id_len];
            if mem.read(&caller, id_ptr as usize, &mut id_buf).is_err() {
                return ABI_ERROR;
            }
            let Ok(message_id) = std::str::from_utf8(&id_buf) else {
                return ABI_ERROR;
            };
            match mail.get_message_metadata(message_id) {
                Ok(meta) => write_meta(&mut caller, &mem, out_ptr as usize, out_cap, &meta),
                Err(MailError::Denied(_)) => ABI_DENIED,
                Err(_) => ABI_ERROR,
            }
        },
    )?;
    Ok(())
}

struct ExtMem(Memory);

fn memory_export(caller: &mut Caller<'_, HostState>) -> Option<ExtMem> {
    match caller.get_export("memory") {
        Some(Extern::Memory(m)) => Some(ExtMem(m)),
        _ => None,
    }
}

fn write_meta(
    caller: &mut Caller<'_, HostState>,
    mem: &Memory,
    out_ptr: usize,
    out_cap: usize,
    meta: &MessageMetadata,
) -> i32 {
    let Ok(json) = metadata_to_json(meta) else {
        return ABI_ERROR;
    };
    let bytes = json.as_bytes();
    if bytes.len() > out_cap {
        return ABI_OVERFLOW;
    }
    if mem.write(&mut *caller, out_ptr, bytes).is_err() {
        return ABI_ERROR;
    }
    let len = bytes.len() as i32;
    caller.data_mut().last_meta_json = Some(json);
    len
}

/// Sample plugin: imports mail metadata and exposes `read_meta`.
/// Message id `"msg_1"` is embedded at offset 0; JSON written at offset 64.
pub const MAIL_READER_WAT: &str = r#"
(module
  (import "nitra_mail" "get_metadata"
    (func $get_metadata (param i32 i32 i32 i32) (result i32)))
  (memory (export "memory") 1)
  (data (i32.const 0) "msg_1")
  (func (export "activate") (result i32) i32.const 0)
  (func (export "deactivate") (result i32) i32.const 0)
  (func (export "ping") (result i32) i32.const 1)
  (func (export "read_meta") (result i32)
    (call $get_metadata
      (i32.const 0)
      (i32.const 5)
      (i32.const 64)
      (i32.const 256)))
)
"#;

pub const MAIL_READER_OUT_PTR: usize = 64;
