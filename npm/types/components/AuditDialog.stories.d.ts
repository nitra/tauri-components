declare namespace _default {
    export let title: string;
    export { AuditDialog as component };
    export namespace args {
        let modelValue: boolean;
        let agent: object;
    }
}
export default _default;
export const Default: {};
export namespace Empty {
    export namespace args_1 {
        export namespace agent_1 {
            namespace journal {
                function list(): never[];
            }
            function respond(): null;
            function approve(): null;
        }
        export { agent_1 as agent };
    }
    export { args_1 as args };
}
