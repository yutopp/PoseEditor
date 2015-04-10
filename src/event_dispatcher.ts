module PoseEditor {
    export class EventDispatcher {
        public addCallback(type: string, f: any): void {
            if ( this.events[type] == null ) {
                this.events[type] = [];
            }
            this.events[type].push(f);
        }

        public dispatchCallback(type: string, ...args: any[]): void {
            if ( this.events[type] != null ) {
                this.events[type].forEach((f: any) => {
                    f.apply({}, args);
                });
            }
        }

        //
        private events: {[key: string]: Array<any>} = {};
    }
}