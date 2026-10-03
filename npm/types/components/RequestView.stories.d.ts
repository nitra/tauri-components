declare namespace _default {
    export let title: string;
    export { RequestView as component };
}
export default _default;
export namespace Pending {
    namespace args {
        namespace result {
            let status: string;
        }
    }
}
export namespace Done {
    export namespace args_1 {
        export namespace result_1 {
            let status_1: string;
            export { status_1 as status };
            export let summary: string;
            export let actions: {
                tool: string;
                input: {
                    path: string;
                };
                envelope: {
                    ok: boolean;
                };
            }[];
        }
        export { result_1 as result };
    }
    export { args_1 as args };
}
export namespace ActionFailure {
    export namespace args_2 {
        export namespace result_2 {
            let status_2: string;
            export { status_2 as status };
            let summary_1: string;
            export { summary_1 as summary };
            let actions_1: {
                tool: string;
                input: {
                    path: string;
                };
                envelope: {
                    ok: boolean;
                };
            }[];
            export { actions_1 as actions };
        }
        export { result_2 as result };
    }
    export { args_2 as args };
}
export namespace NeedsClarification {
    export namespace args_3 {
        export namespace result_3 {
            let status_3: string;
            export { status_3 as status };
            export let question: string;
        }
        export { result_3 as result };
    }
    export { args_3 as args };
}
export namespace Failed {
    export namespace args_4 {
        export namespace result_4 {
            let status_4: string;
            export { status_4 as status };
            export let error: string;
        }
        export { result_4 as result };
    }
    export { args_4 as args };
}
