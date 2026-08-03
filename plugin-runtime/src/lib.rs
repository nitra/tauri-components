//! Wasmtime runtime for nitra plugins (M2).
//!
//! Shared [`Engine`], per-invocation [`Store`], fuel / epoch / memory limits,
//! concurrency cap, nested-invocation guard, and circuit breaker.
//!
//! M2 loads **core Wasm** modules whose exports match the WIT world in
//! `wit/plugin.wit` (`activate`, `deactivate`, `ping`). Component Model loading
//! lands with domain WIT in M3; the public lifecycle API stays stable.
//!
//! Note: epoch interruption is engine-global. Each invoke only increments the
//! epoch if it is still running when its wall-clock budget expires.

use std::cell::Cell;
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use wasmtime::{Config, Engine, Linker, Module, Store, StoreLimits, StoreLimitsBuilder, Trap};

mod mail_abi;

pub use mail_abi::{MAIL_READER_OUT_PTR, MAIL_READER_WAT};
pub use plugin_mail::{
    scope_metadata_message, GrantGatedMailHost, MailError, MailHost, MessageMetadata, MockMailHost,
    CAP_MAIL_METADATA_READ,
};

thread_local! {
    /// Same-thread re-entrancy into `invoke` (host callback → same plugin).
    static INVOKE_DEPTH: Cell<u32> = const { Cell::new(0) };
}

/// Spec placeholders (§2 Й) until M2 benchmark confirms or updates them.
pub const DEFAULT_MEMORY_BYTES: usize = 32 * 1024 * 1024;
pub const DEFAULT_FUEL: u64 = 50_000_000;
pub const DEFAULT_WALL_CLOCK: Duration = Duration::from_secs(2);
pub const DEFAULT_MAX_CONCURRENT: u32 = 2;
/// Failures in a row before the circuit opens.
pub const DEFAULT_CIRCUIT_THRESHOLD: u32 = 3;
pub const DEFAULT_CIRCUIT_COOLDOWN: Duration = Duration::from_secs(30);

/// Cold render/ping SLO target from the platform spec (sample, no heavy I/O).
pub const BENCHMARK_COLD_P95_MS: u128 = 150;
/// Warm ping SLO target.
pub const BENCHMARK_WARM_P95_MS: u128 = 40;

/// Runtime / invocation errors.
#[derive(Debug, thiserror::Error)]
pub enum RuntimeError {
    #[error("wasmtime: {0}")]
    Wasmtime(#[from] wasmtime::Error),
    #[error("trap: {0}")]
    Trap(String),
    #[error("out of fuel")]
    OutOfFuel,
    #[error("wall-clock timeout")]
    Timeout,
    #[error("memory limit exceeded")]
    MemoryLimit,
    #[error("circuit open for plugin {plugin_id}")]
    CircuitOpen { plugin_id: String },
    #[error("max concurrent invocations reached for plugin {plugin_id}")]
    ConcurrencyLimit { plugin_id: String },
    #[error("nested invocation forbidden for plugin {plugin_id}")]
    NestedInvocation { plugin_id: String },
    #[error("missing export `{0}`")]
    MissingExport(String),
    #[error("invalid plugin: {0}")]
    Invalid(String),
}

/// Tunable limits for each invocation.
#[derive(Debug, Clone)]
pub struct ResourceLimits {
    pub memory_bytes: usize,
    pub fuel: u64,
    pub wall_clock: Duration,
    pub max_concurrent: u32,
}

impl Default for ResourceLimits {
    fn default() -> Self {
        Self {
            memory_bytes: DEFAULT_MEMORY_BYTES,
            fuel: DEFAULT_FUEL,
            wall_clock: DEFAULT_WALL_CLOCK,
            max_concurrent: DEFAULT_MAX_CONCURRENT,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CircuitState {
    Closed,
    Open,
}

struct CircuitBreaker {
    failures: u32,
    state: CircuitState,
    opened_at: Option<Instant>,
    threshold: u32,
    cooldown: Duration,
}

impl CircuitBreaker {
    fn new(threshold: u32, cooldown: Duration) -> Self {
        Self {
            failures: 0,
            state: CircuitState::Closed,
            opened_at: None,
            threshold,
            cooldown,
        }
    }

    fn ensure_closed(&mut self, plugin_id: &str) -> Result<(), RuntimeError> {
        if self.state == CircuitState::Open {
            if let Some(opened) = self.opened_at {
                if opened.elapsed() >= self.cooldown {
                    self.state = CircuitState::Closed;
                    self.failures = 0;
                    self.opened_at = None;
                    return Ok(());
                }
            }
            return Err(RuntimeError::CircuitOpen {
                plugin_id: plugin_id.to_string(),
            });
        }
        Ok(())
    }

    fn on_success(&mut self) {
        self.failures = 0;
        self.state = CircuitState::Closed;
        self.opened_at = None;
    }

    fn on_failure(&mut self) {
        self.failures = self.failures.saturating_add(1);
        if self.failures >= self.threshold {
            self.state = CircuitState::Open;
            self.opened_at = Some(Instant::now());
        }
    }
}

struct PluginSlot {
    module: Module,
    active: AtomicBool,
    inflight: AtomicU32,
    circuit: Mutex<CircuitBreaker>,
}

/// Host-side handle to a loaded plugin module.
#[derive(Clone)]
pub struct PluginHandle {
    id: Arc<str>,
    slot: Arc<PluginSlot>,
}

impl PluginHandle {
    pub fn id(&self) -> &str {
        &self.id
    }

    pub fn is_active(&self) -> bool {
        self.slot.active.load(Ordering::SeqCst)
    }
}

pub(crate) struct HostState {
    pub(crate) limits: StoreLimits,
    pub(crate) mail: Option<Arc<dyn MailHost>>,
    pub(crate) last_meta_json: Option<String>,
}

/// Shared Wasmtime engine + loaded plugins.
pub struct PluginRuntime {
    engine: Engine,
    limits: ResourceLimits,
    plugins: Mutex<HashMap<String, Arc<PluginSlot>>>,
}

impl PluginRuntime {
    /// Create a runtime with fuel + epoch interruption enabled.
    pub fn new(limits: ResourceLimits) -> Result<Self, RuntimeError> {
        let mut config = Config::new();
        config.consume_fuel(true);
        config.epoch_interruption(true);
        config.cranelift_opt_level(wasmtime::OptLevel::Speed);
        let engine = Engine::new(&config)?;
        Ok(Self {
            engine,
            limits,
            plugins: Mutex::new(HashMap::new()),
        })
    }

    pub fn limits(&self) -> &ResourceLimits {
        &self.limits
    }

    pub fn engine(&self) -> &Engine {
        &self.engine
    }

    /// Compile and register a plugin from Wasm bytes (core module).
    pub fn load_wasm(&self, plugin_id: &str, wasm: &[u8]) -> Result<PluginHandle, RuntimeError> {
        let module = Module::new(&self.engine, wasm)?;
        self.register_module(plugin_id, module)
    }

    /// Compile from WAT text (tests / fixtures).
    pub fn load_wat(&self, plugin_id: &str, wat: &str) -> Result<PluginHandle, RuntimeError> {
        let module = Module::new(&self.engine, wat)?;
        self.register_module(plugin_id, module)
    }

    /// Load Wasm bytes from a filesystem path.
    pub fn load_path(&self, plugin_id: &str, path: &Path) -> Result<PluginHandle, RuntimeError> {
        let bytes = std::fs::read(path).map_err(|e| RuntimeError::Invalid(e.to_string()))?;
        self.load_wasm(plugin_id, &bytes)
    }

    fn register_module(
        &self,
        plugin_id: &str,
        module: Module,
    ) -> Result<PluginHandle, RuntimeError> {
        let slot = Arc::new(PluginSlot {
            module,
            active: AtomicBool::new(false),
            inflight: AtomicU32::new(0),
            circuit: Mutex::new(CircuitBreaker::new(
                DEFAULT_CIRCUIT_THRESHOLD,
                DEFAULT_CIRCUIT_COOLDOWN,
            )),
        });
        let mut map = self.plugins.lock().expect("plugins mutex");
        map.insert(plugin_id.to_string(), Arc::clone(&slot));
        Ok(PluginHandle {
            id: Arc::from(plugin_id),
            slot,
        })
    }

    /// Call `activate` export and mark plugin active.
    pub fn activate(&self, handle: &PluginHandle) -> Result<(), RuntimeError> {
        self.invoke(handle, "activate", &[])?;
        handle.slot.active.store(true, Ordering::SeqCst);
        Ok(())
    }

    /// Call `deactivate` export and mark plugin inactive.
    pub fn deactivate(&self, handle: &PluginHandle) -> Result<(), RuntimeError> {
        self.invoke(handle, "deactivate", &[])?;
        handle.slot.active.store(false, Ordering::SeqCst);
        Ok(())
    }

    /// Call `ping` → `u32` result.
    pub fn ping(&self, handle: &PluginHandle) -> Result<u32, RuntimeError> {
        let results = self.invoke(handle, "ping", &[])?;
        match results.first() {
            Some(wasmtime::Val::I32(v)) => Ok(*v as u32),
            _ => Err(RuntimeError::Invalid("ping must return i32".into())),
        }
    }

    /// Invoke an export with a [`MailHost`] linked as `nitra_mail.get_metadata`.
    pub fn invoke_with_mail(
        &self,
        handle: &PluginHandle,
        export: &str,
        args: &[wasmtime::Val],
        mail: Arc<dyn MailHost>,
    ) -> Result<Vec<wasmtime::Val>, RuntimeError> {
        self.invoke_guarded(handle, export, args, Some(mail))
    }

    /// Run sample `read_meta` export and parse JSON metadata produced via host import.
    pub fn read_meta_via_plugin(
        &self,
        handle: &PluginHandle,
        mail: Arc<dyn MailHost>,
    ) -> Result<MessageMetadata, RuntimeError> {
        let (results, json) =
            self.invoke_guarded_with_json(handle, "read_meta", &[], Some(mail))?;
        let code = match results.first() {
            Some(wasmtime::Val::I32(v)) => *v,
            _ => return Err(RuntimeError::Invalid("read_meta must return i32".into())),
        };
        if code == mail_abi::ABI_DENIED {
            return Err(RuntimeError::Invalid("mail metadata denied".into()));
        }
        if code < 0 {
            return Err(RuntimeError::Invalid(format!(
                "mail metadata abi error {code}"
            )));
        }
        let json = json.ok_or_else(|| RuntimeError::Invalid("missing metadata json".into()))?;
        serde_json::from_str(&json).map_err(|e| RuntimeError::Invalid(e.to_string()))
    }

    /// Generic export call with limits + guards (no mail imports).
    pub fn invoke(
        &self,
        handle: &PluginHandle,
        export: &str,
        args: &[wasmtime::Val],
    ) -> Result<Vec<wasmtime::Val>, RuntimeError> {
        self.invoke_guarded(handle, export, args, None)
    }

    fn invoke_guarded(
        &self,
        handle: &PluginHandle,
        export: &str,
        args: &[wasmtime::Val],
        mail: Option<Arc<dyn MailHost>>,
    ) -> Result<Vec<wasmtime::Val>, RuntimeError> {
        let (results, _) = self.invoke_guarded_with_json(handle, export, args, mail)?;
        Ok(results)
    }

    fn invoke_guarded_with_json(
        &self,
        handle: &PluginHandle,
        export: &str,
        args: &[wasmtime::Val],
        mail: Option<Arc<dyn MailHost>>,
    ) -> Result<(Vec<wasmtime::Val>, Option<String>), RuntimeError> {
        let nested = INVOKE_DEPTH.with(|d| d.get() > 0);
        if nested {
            return Err(RuntimeError::NestedInvocation {
                plugin_id: handle.id.to_string(),
            });
        }

        INVOKE_DEPTH.with(|d| d.set(d.get() + 1));
        let result = (|| {
            {
                let mut circuit = handle.slot.circuit.lock().expect("circuit");
                circuit.ensure_closed(handle.id.as_ref())?;
            }

            let inflight = handle.slot.inflight.fetch_add(1, Ordering::SeqCst) + 1;
            if inflight > self.limits.max_concurrent {
                handle.slot.inflight.fetch_sub(1, Ordering::SeqCst);
                return Err(RuntimeError::ConcurrencyLimit {
                    plugin_id: handle.id.to_string(),
                });
            }

            let invoke_result = self.invoke_inner(handle, export, args, mail);
            handle.slot.inflight.fetch_sub(1, Ordering::SeqCst);

            let mut circuit = handle.slot.circuit.lock().expect("circuit");
            match &invoke_result {
                Ok(_) => circuit.on_success(),
                Err(RuntimeError::OutOfFuel)
                | Err(RuntimeError::Timeout)
                | Err(RuntimeError::Trap(_))
                | Err(RuntimeError::MemoryLimit) => circuit.on_failure(),
                Err(_) => {}
            }
            invoke_result
        })();
        INVOKE_DEPTH.with(|d| d.set(d.get().saturating_sub(1)));
        result
    }

    fn invoke_inner(
        &self,
        handle: &PluginHandle,
        export: &str,
        args: &[wasmtime::Val],
        mail: Option<Arc<dyn MailHost>>,
    ) -> Result<(Vec<wasmtime::Val>, Option<String>), RuntimeError> {
        let store_limits = StoreLimitsBuilder::new()
            .memory_size(self.limits.memory_bytes)
            .trap_on_grow_failure(true)
            .build();

        let mut store = Store::new(
            &self.engine,
            HostState {
                limits: store_limits,
                mail,
                last_meta_json: None,
            },
        );
        store.limiter(|state| &mut state.limits);
        store.set_fuel(self.limits.fuel)?;
        store.set_epoch_deadline(1);
        store.epoch_deadline_trap();

        let mut linker = Linker::new(&self.engine);
        mail_abi::define_mail_imports(&mut linker)?;
        let instance = linker.instantiate(&mut store, &handle.slot.module)?;

        let func = instance
            .get_func(&mut store, export)
            .ok_or_else(|| RuntimeError::MissingExport(export.to_string()))?;

        let still_running = Arc::new(AtomicBool::new(true));
        let flag = Arc::clone(&still_running);
        let engine = self.engine.clone();
        let wall = self.limits.wall_clock;
        let _ticker = thread::spawn(move || {
            thread::sleep(wall);
            if flag.load(Ordering::SeqCst) {
                engine.increment_epoch();
            }
        });

        let result_len = func.ty(&store).results().len();
        let mut results = vec![wasmtime::Val::I32(0); result_len];
        let call = func.call(&mut store, args, &mut results);
        still_running.store(false, Ordering::SeqCst);

        match call {
            Ok(()) => {
                let json = store.data().last_meta_json.clone();
                Ok((results, json))
            }
            Err(err) => Err(classify_trap(err)),
        }
    }

    pub fn is_circuit_open(&self, handle: &PluginHandle) -> bool {
        let mut c = handle.slot.circuit.lock().expect("circuit");
        c.ensure_closed(handle.id.as_ref()).is_err()
    }
}

fn classify_trap(err: wasmtime::Error) -> RuntimeError {
    let msg = err.to_string();
    if let Some(trap) = err.downcast_ref::<Trap>() {
        match trap {
            Trap::OutOfFuel => return RuntimeError::OutOfFuel,
            Trap::Interrupt => return RuntimeError::Timeout,
            Trap::AllocationTooLarge | Trap::MemoryOutOfBounds => {
                return RuntimeError::MemoryLimit;
            }
            _ => return RuntimeError::Trap(format!("{trap}: {msg}")),
        }
    }
    if msg.contains("fuel") {
        return RuntimeError::OutOfFuel;
    }
    if msg.contains("epoch") || msg.contains("interrupt") {
        return RuntimeError::Timeout;
    }
    if msg.contains("memory") || msg.contains("grow") {
        return RuntimeError::MemoryLimit;
    }
    RuntimeError::Trap(msg)
}

/// Minimal hello plugin WAT matching `wit/plugin.wit` export names.
pub const HELLO_WAT: &str = r#"
(module
  (func (export "activate") (result i32)
    i32.const 0)
  (func (export "deactivate") (result i32)
    i32.const 0)
  (func (export "ping") (result i32)
    i32.const 42)
)
"#;

/// Busy-loop plugin for epoch timeout tests.
pub const TIMEOUT_WAT: &str = r#"
(module
  (func (export "activate") (result i32) i32.const 0)
  (func (export "deactivate") (result i32) i32.const 0)
  (func (export "ping") (result i32)
    (loop $l
      br $l)
    i32.const 0)
)
"#;

/// Fuel-burning loop.
pub const FUEL_HOG_WAT: &str = r#"
(module
  (func (export "activate") (result i32) i32.const 0)
  (func (export "deactivate") (result i32) i32.const 0)
  (func (export "ping") (result i32)
    (local $i i32)
    (local.set $i (i32.const 0))
    (loop $l
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $l (i32.lt_u (local.get $i) (i32.const 100000000)))
    )
    local.get $i)
)
"#;

/// Explicit unreachable trap.
pub const TRAP_WAT: &str = r#"
(module
  (func (export "activate") (result i32) i32.const 0)
  (func (export "deactivate") (result i32) i32.const 0)
  (func (export "ping") (result i32)
    unreachable)
)
"#;

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Barrier;

    fn runtime_with(limits: ResourceLimits) -> PluginRuntime {
        PluginRuntime::new(limits).unwrap()
    }

    #[test]
    fn activate_ping_deactivate_hello() {
        let rt = runtime_with(ResourceLimits {
            wall_clock: Duration::from_secs(5),
            ..ResourceLimits::default()
        });
        let h = rt.load_wat("hello", HELLO_WAT).unwrap();
        rt.activate(&h).unwrap();
        assert!(h.is_active());
        assert_eq!(rt.ping(&h).unwrap(), 42);
        rt.deactivate(&h).unwrap();
    }

    #[test]
    fn out_of_fuel() {
        let limits = ResourceLimits {
            fuel: 100,
            wall_clock: Duration::from_secs(5),
            ..ResourceLimits::default()
        };
        let rt = runtime_with(limits);
        let h = rt.load_wat("fuel", FUEL_HOG_WAT).unwrap();
        let err = rt.ping(&h).unwrap_err();
        assert!(
            matches!(err, RuntimeError::OutOfFuel),
            "expected OutOfFuel, got {err}"
        );
    }

    #[test]
    fn epoch_timeout() {
        let limits = ResourceLimits {
            fuel: u64::MAX / 4,
            wall_clock: Duration::from_millis(50),
            ..ResourceLimits::default()
        };
        let rt = runtime_with(limits);
        let h = rt.load_wat("timeout", TIMEOUT_WAT).unwrap();
        let err = rt.ping(&h).unwrap_err();
        assert!(
            matches!(err, RuntimeError::Timeout | RuntimeError::OutOfFuel),
            "expected Timeout, got {err}"
        );
    }

    #[test]
    fn trap_guest() {
        let rt = runtime_with(ResourceLimits {
            wall_clock: Duration::from_secs(5),
            ..ResourceLimits::default()
        });
        let h = rt.load_wat("trap", TRAP_WAT).unwrap();
        let err = rt.ping(&h).unwrap_err();
        assert!(matches!(err, RuntimeError::Trap(_)), "got {err}");
    }

    #[test]
    fn nested_invocation_forbidden() {
        let limits = ResourceLimits {
            wall_clock: Duration::from_secs(5),
            ..ResourceLimits::default()
        };
        let rt = runtime_with(limits);
        let h = rt.load_wat("nested", HELLO_WAT).unwrap();
        // Simulate host callback re-entering invoke on the same thread.
        INVOKE_DEPTH.with(|d| d.set(1));
        let err = rt.ping(&h).unwrap_err();
        INVOKE_DEPTH.with(|d| d.set(0));
        assert!(matches!(err, RuntimeError::NestedInvocation { .. }));
    }

    #[test]
    fn concurrency_limit() {
        let limits = ResourceLimits {
            fuel: u64::MAX / 4,
            wall_clock: Duration::from_millis(300),
            max_concurrent: 1,
            ..ResourceLimits::default()
        };
        let rt = Arc::new(runtime_with(limits));
        let h = rt.load_wat("conc", TIMEOUT_WAT).unwrap();
        let barrier = Arc::new(Barrier::new(2));

        let rt1 = Arc::clone(&rt);
        let h1 = h.clone();
        let b1 = Arc::clone(&barrier);
        let t1 = thread::spawn(move || {
            b1.wait();
            rt1.ping(&h1)
        });

        let rt2 = Arc::clone(&rt);
        let h2 = h.clone();
        let b2 = Arc::clone(&barrier);
        let t2 = thread::spawn(move || {
            b2.wait();
            thread::sleep(Duration::from_millis(10));
            rt2.ping(&h2)
        });

        let r1 = t1.join().unwrap();
        let r2 = t2.join().unwrap();
        let errs = [r1, r2];
        assert!(
            errs.iter()
                .any(|r| matches!(r, Err(RuntimeError::ConcurrencyLimit { .. }))),
            "expected concurrency limit, got {errs:?}"
        );
    }

    #[test]
    fn circuit_opens_after_repeated_traps() {
        let rt = runtime_with(ResourceLimits {
            wall_clock: Duration::from_secs(5),
            ..ResourceLimits::default()
        });
        let h = rt.load_wat("circuit", TRAP_WAT).unwrap();
        for _ in 0..DEFAULT_CIRCUIT_THRESHOLD {
            let _ = rt.ping(&h);
        }
        assert!(rt.is_circuit_open(&h));
        let err = rt.ping(&h).unwrap_err();
        assert!(matches!(err, RuntimeError::CircuitOpen { .. }));
    }

    #[test]
    fn benchmark_gate_hello_within_slo() {
        let rt = runtime_with(ResourceLimits {
            wall_clock: Duration::from_secs(5),
            ..ResourceLimits::default()
        });
        let h = rt.load_wat("bench", HELLO_WAT).unwrap();

        let cold_start = Instant::now();
        rt.activate(&h).unwrap();
        let _ = rt.ping(&h).unwrap();
        let cold_ms = cold_start.elapsed().as_millis();

        let mut warm = Vec::new();
        for _ in 0..20 {
            let t0 = Instant::now();
            let _ = rt.ping(&h).unwrap();
            warm.push(t0.elapsed().as_millis());
        }
        warm.sort_unstable();
        let p95_idx = ((warm.len() as f64) * 0.95).ceil() as usize - 1;
        let warm_p95 = warm[p95_idx.min(warm.len() - 1)];

        assert!(
            cold_ms <= BENCHMARK_COLD_P95_MS,
            "cold {cold_ms}ms exceeds SLO {BENCHMARK_COLD_P95_MS}ms — update §2 Й placeholders"
        );
        assert!(
            warm_p95 <= BENCHMARK_WARM_P95_MS,
            "warm p95 {warm_p95}ms exceeds SLO {BENCHMARK_WARM_P95_MS}ms — update §2 Й placeholders"
        );
    }

    #[test]
    fn sample_plugin_reads_metadata_with_grant() {
        use plugin_permissions::Grant;
        use std::sync::Mutex;
        use tempfile::tempdir;

        let dir = tempdir().unwrap();
        let grants = Arc::new(Mutex::new(
            plugin_permissions::GrantStore::open(dir.path().join("g.json")).unwrap(),
        ));
        grants
            .lock()
            .unwrap()
            .grant(Grant {
                plugin_id: "com.example.mail-reader".into(),
                user_id: "u1".into(),
                scope: scope_metadata_message("msg_1"),
                granted_at_unix: 1,
            })
            .unwrap();

        let mock = MockMailHost {
            messages: vec![MessageMetadata {
                id: "msg_1".into(),
                from: "a@example.com".into(),
                subject: "Hello meta".into(),
                date: "2026-08-03".into(),
            }],
        };
        let mail: Arc<dyn MailHost> = Arc::new(GrantGatedMailHost::new(
            mock,
            grants,
            "com.example.mail-reader",
            "u1",
        ));

        let rt = runtime_with(ResourceLimits {
            wall_clock: Duration::from_secs(5),
            ..ResourceLimits::default()
        });
        let h = rt
            .load_wat("com.example.mail-reader", MAIL_READER_WAT)
            .unwrap();
        rt.activate(&h).unwrap();
        let meta = rt.read_meta_via_plugin(&h, mail).unwrap();
        assert_eq!(meta.subject, "Hello meta");
        assert_eq!(meta.from, "a@example.com");
    }

    #[test]
    fn sample_plugin_denied_without_grant() {
        use std::sync::Mutex;
        use tempfile::tempdir;

        let dir = tempdir().unwrap();
        let grants = Arc::new(Mutex::new(
            plugin_permissions::GrantStore::open(dir.path().join("g.json")).unwrap(),
        ));
        let mock = MockMailHost {
            messages: vec![MessageMetadata {
                id: "msg_1".into(),
                from: "a@example.com".into(),
                subject: "Hello meta".into(),
                date: "2026-08-03".into(),
            }],
        };
        let mail: Arc<dyn MailHost> = Arc::new(GrantGatedMailHost::new(
            mock,
            grants,
            "com.example.mail-reader",
            "u1",
        ));

        let rt = runtime_with(ResourceLimits {
            wall_clock: Duration::from_secs(5),
            ..ResourceLimits::default()
        });
        let h = rt
            .load_wat("com.example.mail-reader", MAIL_READER_WAT)
            .unwrap();
        let err = rt.read_meta_via_plugin(&h, mail).unwrap_err();
        assert!(
            err.to_string().contains("denied"),
            "expected denied, got {err}"
        );
    }
}
