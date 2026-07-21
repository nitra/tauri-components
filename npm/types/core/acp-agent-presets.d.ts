export namespace CODEX_ACP_AGENT_PRESET {
    let command: string;
    let args: string[];
    namespace tiers {
        namespace MIN {
            let label: string;
            let env: {
                CODEX_CONFIG: string;
            };
        }
        namespace AVG {
            let label_1: string;
            export { label_1 as label };
            let env_1: {
                CODEX_CONFIG: string;
            };
            export { env_1 as env };
        }
        namespace MAX {
            let label_2: string;
            export { label_2 as label };
            let env_2: {
                CODEX_CONFIG: string;
            };
            export { env_2 as env };
        }
    }
}
