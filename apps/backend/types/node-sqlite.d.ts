declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(filename: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
  export class StatementSync {
    get(...params: any[]): any;
    all(...params: any[]): any[];
    run(...params: any[]): { changes: number; lastInsertRowid: bigint; };
    bind(...params: any[]): void;
    run(): void;
  }
}
