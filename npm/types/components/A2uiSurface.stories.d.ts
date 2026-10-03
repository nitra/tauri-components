declare namespace _default {
    export let title: string;
    export { A2uiSurface as component };
}
export default _default;
export namespace SampleSidebar {
    namespace args {
        export { SAMPLE_SIDEBAR_STREAM as messages };
    }
}
export namespace InvalidCatalog {
    export namespace args_1 {
        let messages: {
            version: string;
            createSurface: {
                surfaceId: string;
                catalogId: string;
                components: {
                    id: string;
                    component: string;
                    text: string;
                }[];
            };
        }[];
    }
    export { args_1 as args };
}
import { SAMPLE_SIDEBAR_STREAM } from '../a2ui/validate.js';
