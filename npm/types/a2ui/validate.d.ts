/**
 * Lightweight JS mirror of plugin-a2ui catalog checks for Vue unit tests.
 * Production host should prefer the Rust validator; this rejects unknown
 * catalog refs / components so unrecognized content is never rendered.
 * @param {object[]} messages
 * @returns {{ ok: true, surfaces: Map<string, object> } | { ok: false, error: string }}
 */
export function validateA2uiStream(messages: object[]): {
    ok: true;
    surfaces: Map<string, object>;
} | {
    ok: false;
    error: string;
};
/** Fixture mirroring plugin-a2ui/fixtures/sidebar_sample.json */
export const SAMPLE_SIDEBAR_STREAM: {
    version: string;
    createSurface: {
        surfaceId: string;
        catalogId: string;
        components: ({
            id: string;
            component: string;
            children: string[];
            justify: string;
            align: string;
            text?: undefined;
            variant?: undefined;
            child?: undefined;
            action?: undefined;
        } | {
            id: string;
            component: string;
            text: string;
            variant: string;
            children?: undefined;
            justify?: undefined;
            align?: undefined;
            child?: undefined;
            action?: undefined;
        } | {
            id: string;
            component: string;
            text: string;
            children?: undefined;
            justify?: undefined;
            align?: undefined;
            variant?: undefined;
            child?: undefined;
            action?: undefined;
        } | {
            id: string;
            component: string;
            child: string;
            variant: string;
            action: {
                event: {
                    name: string;
                    context: {
                        messageId: string;
                    };
                };
            };
            children?: undefined;
            justify?: undefined;
            align?: undefined;
            text?: undefined;
        })[];
        dataModel: {
            messageId: string;
        };
    };
}[];
