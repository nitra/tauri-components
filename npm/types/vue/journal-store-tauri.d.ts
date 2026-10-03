/**
 * @returns {{ create: (r:object)=>Promise<string>, load: (id:string)=>Promise<object>, update: (id:string,patch:object)=>Promise<void>, list: ()=>Promise<object[]> }} journal store
 */
export function createTauriJournalStore(): {
    create: (r: object) => Promise<string>;
    load: (id: string) => Promise<object>;
    update: (id: string, patch: object) => Promise<void>;
    list: () => Promise<object[]>;
};
