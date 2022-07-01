import initSqlJs, {Database, SqlValue} from "sql.js";
import * as fs from "fs";

export type Table = {
    name: string,
    columns: Column[],
    values: SqlValue[][]
}

export type Column = {
    name: string,
    type: string,
}

const dbCacheFile = process.env.DB_CACHE_PATH!;

export let db: Database;
export let knownTables = new Map<string, string[]>();

export async function initDB(fromCache: boolean, ...orTables: Table[]) {
    let SQL = await initSqlJs();

    if (fromCache && fs.existsSync(dbCacheFile)) {
        const buffer = fs.readFileSync(dbCacheFile);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();

        for (let table of orTables) {
            createTable(table);
        }
    }
}

export function writeDB() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbCacheFile, buffer);
}

export function createTable(table: Table) {
    db.run(`CREATE TABLE ${table.name} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${table.columns.map((c) => [c.name, c.type].join(' '))})`);
    table.values?.forEach((row) => {
        db.run(`INSERT INTO ${table.name} (${table.columns.map(c => c.name).join(',')}) VALUES (${row.map(v => sqlValueToStatement(v)).join(", ")})`);
    });

    knownTables.set(table.name, table.columns.map(c => c.name));
}

export function discoverTables(db: Database, tableNames: string[]) {
    for (let tableName of tableNames) {
        const columns = db.exec(`PRAGMA table_info(${tableName})`)[0].values.map((cref) => cref[1] as string);
        columns.shift();
        knownTables.set(tableName, columns);
    }
}

function sqlValueToStatement(v: SqlValue): string {
    switch (typeof v) {
        case "number":
            return v.toString();
        case "string":
            return `'${v}'`;
        default:
            return v?.toString() ?? "";
    }
}
