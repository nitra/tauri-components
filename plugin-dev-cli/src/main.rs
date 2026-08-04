//! `nitra-plugin` — developer CLI for `.n-plugin` packages (M1).
//!
//! Private signing keys live in the OS keychain (`keyring`). Trusted public keys
//! for install TOFU live under `--app-data/plugins/trust-store.json`.

use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use keyring::Entry;
use plugin_manifest::PluginManifest;
use plugin_package::{
    generate_keypair, install_package, pack_directory, signing_key_from_bytes, verify_package,
    write_public_key_file, InstallOptions,
};
use plugin_permissions::{trust_store_path, TrustStore};

const SERVICE: &str = "nitra-plugin-dev";

#[derive(Parser, Debug)]
#[command(name = "nitra-plugin", about = "Build and install .n-plugin packages")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Generate an Ed25519 keypair; private key stored in OS keychain.
    Keygen {
        /// Publisher key id stored in plugin.toml (`publisher_key_id`).
        #[arg(long)]
        key_id: String,
        /// Also write public key hex to this path.
        #[arg(long)]
        public_out: Option<PathBuf>,
    },
    /// Validate a `plugin.toml` file.
    Validate {
        #[arg(long)]
        manifest: PathBuf,
    },
    /// Pack a staging directory into a signed `.n-plugin`.
    Package {
        /// Directory containing plugin.toml, component.wasm, settings.schema.json, changelog.md.
        #[arg(long)]
        dir: PathBuf,
        /// Output `.n-plugin` path.
        #[arg(long)]
        out: PathBuf,
        /// Keychain entry / publisher_key_id used for signing.
        #[arg(long)]
        key_id: String,
    },
    /// Verify an existing package against a public key.
    Verify {
        #[arg(long)]
        package: PathBuf,
        #[arg(long)]
        public_key: PathBuf,
        /// Allow missing signature (debug only).
        #[arg(long, default_value_t = false)]
        allow_unsigned: bool,
    },
    /// Install a package into a local registry with TOFU trust.
    Install {
        #[arg(long)]
        package: PathBuf,
        /// App data root (trust store + registry).
        #[arg(long)]
        app_data: PathBuf,
        /// Public key hex file (required for first TOFU trust).
        #[arg(long)]
        public_key: Option<PathBuf>,
        /// Accept new publisher key (TOFU).
        #[arg(long, default_value_t = false)]
        tofu_accept: bool,
        /// Debug-only: allow unsigned packages.
        #[arg(long, default_value_t = false)]
        allow_unsigned: bool,
    },
}

fn keychain_entry(key_id: &str) -> Result<Entry> {
    Entry::new(SERVICE, key_id).context("open OS keychain entry")
}

fn store_secret_key(key_id: &str, secret: &[u8]) -> Result<()> {
    let entry = keychain_entry(key_id)?;
    entry
        .set_secret(secret)
        .context("store signing key in OS keychain")
}

fn load_signing_key(key_id: &str) -> Result<ed25519_dalek::SigningKey> {
    let entry = keychain_entry(key_id)?;
    let secret = entry
        .get_secret()
        .context("read signing key from OS keychain")?;
    signing_key_from_bytes(&secret).map_err(Into::into)
}

fn read_hex_file(path: &Path) -> Result<String> {
    Ok(fs::read_to_string(path)?.trim().to_string())
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Keygen { key_id, public_out } => {
            let (sk, pub_hex) = generate_keypair();
            store_secret_key(&key_id, sk.to_bytes().as_ref())?;
            if let Some(path) = public_out {
                if let Some(parent) = path.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::write(&path, format!("{pub_hex}\n"))?;
                println!("public key written to {}", path.display());
            }
            println!("key_id={key_id}");
            println!("public_key_hex={pub_hex}");
            println!("fingerprint={}", &pub_hex[..pub_hex.len().min(16)]);
            println!("private key stored in OS keychain service={SERVICE}");
        }
        Commands::Validate { manifest } => {
            let m = PluginManifest::from_path(&manifest)?;
            println!("ok id={} version={}", m.id, m.version);
        }
        Commands::Package { dir, out, key_id } => {
            let sk = load_signing_key(&key_id)?;
            if let Some(parent) = out.parent() {
                fs::create_dir_all(parent)?;
            }
            let manifest = pack_directory(&dir, &out, Some(&sk))?;
            let pub_hex = hex::encode(sk.verifying_key().as_bytes());
            let pub_path = write_public_key_file(&out, &pub_hex)?;
            println!(
                "packed {}@{} -> {}",
                manifest.id,
                manifest.version,
                out.display()
            );
            println!("public key companion {}", pub_path.display());
        }
        Commands::Verify {
            package,
            public_key,
            allow_unsigned,
        } => {
            let pub_hex = read_hex_file(&public_key)?;
            let verified = verify_package(&package, Some(&pub_hex), allow_unsigned)?;
            println!(
                "ok id={} version={}",
                verified.manifest.id, verified.manifest.version
            );
        }
        Commands::Install {
            package,
            app_data,
            public_key,
            tofu_accept,
            allow_unsigned,
        } => {
            let pub_hex = match public_key {
                Some(path) => Some(read_hex_file(&path)?),
                None => {
                    // Try companion `.pub` next to package
                    let companion = package.with_file_name(format!(
                        "{}.pub",
                        package
                            .file_name()
                            .and_then(|s| s.to_str())
                            .unwrap_or(plugin_package::DEFAULT_PACKAGE_FILENAME)
                    ));
                    if companion.exists() {
                        Some(read_hex_file(&companion)?)
                    } else {
                        None
                    }
                }
            };

            let mut trust = TrustStore::open(trust_store_path(&app_data))?;
            let registry = app_data.join("plugins").join("registry");
            let opts = InstallOptions {
                allow_unsigned,
                tofu_accept,
                host_platform: semver::Version::new(0, 1, 0),
                host_domains: vec![("nitra:mail".into(), semver::Version::new(0, 1, 0))],
            };

            let installed =
                install_package(&package, &registry, &mut trust, pub_hex.as_deref(), &opts)?;
            println!(
                "installed {}@{} -> {}",
                installed.manifest.id,
                installed.manifest.version,
                installed.install_dir.display()
            );
        }
    }
    Ok(())
}
