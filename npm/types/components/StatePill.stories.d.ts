declare namespace _default {
    export let title: string;
    export { StatePill as component };
    export namespace argTypes {
        namespace status {
            let control: string;
            let options: string[];
        }
    }
}
export default _default;
export namespace Pending {
    namespace args {
        let status_1: string;
        export { status_1 as status };
    }
}
export namespace Running {
    export namespace args_1 {
        let status_2: string;
        export { status_2 as status };
    }
    export { args_1 as args };
}
export namespace Done {
    export namespace args_2 {
        let status_3: string;
        export { status_3 as status };
    }
    export { args_2 as args };
}
export namespace Partial {
    export namespace args_3 {
        let status_4: string;
        export { status_4 as status };
    }
    export { args_3 as args };
}
export namespace NeedsApproval {
    export namespace args_4 {
        let status_5: string;
        export { status_5 as status };
    }
    export { args_4 as args };
}
export namespace Failed {
    export namespace args_5 {
        let status_6: string;
        export { status_6 as status };
    }
    export { args_5 as args };
}
export namespace Rejected {
    export namespace args_6 {
        let status_7: string;
        export { status_7 as status };
    }
    export { args_6 as args };
}
