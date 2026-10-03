declare namespace _default {
    export let title: string;
    export { BaseDialog as component };
    export namespace args {
        export let modelValue: boolean;
        let title_1: string;
        export { title_1 as title };
        export let icon: string;
    }
}
export default _default;
export namespace Default {
    function render(args: any): {
        components: {
            BaseDialog: any;
        };
        setup: () => {
            args: any;
        };
        template: string;
    };
}
export namespace NoIcon {
    export namespace args_1 {
        let icon_1: string;
        export { icon_1 as icon };
    }
    export { args_1 as args };
    export function render_1(args: any): {
        components: {
            BaseDialog: any;
        };
        setup: () => {
            args: any;
        };
        template: string;
    };
    export { render_1 as render };
}
