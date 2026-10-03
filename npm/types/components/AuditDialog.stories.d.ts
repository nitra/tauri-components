declare namespace _default {
    export let title: string;
    export { AuditDialog as component };
    export namespace args {
        let modelValue: boolean;
        let agent: any;
    }
}
export default _default;
export const Default: {};
export namespace Empty {
    export namespace args_1 {
        export namespace agent_1 {
            namespace journal {
                function list(): any[];
            }
            function respond(): any;
            function approve(): any;
        }
        export { agent_1 as agent };
    }
    export { args_1 as args };
}
