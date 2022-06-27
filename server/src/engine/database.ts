import initSqlJs, {Database} from "sql.js";
import * as fs from "fs";

export type Table = {
    name: string,
    columns: string[],
    values: number[][]
}

const dbCacheFile = './cache/database.sqlite'

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
            db.run("CREATE TABLE table1 (id INTEGER PRIMARY KEY AUTOINCREMENT, f1 int, f2 int, f3 int, f4 int, f5 int)");
            table.values.forEach((row) => {
                db.run(`INSERT INTO table1 (${table.columns.join(',')}) VALUES (${row.join(", ")})`);
            });
        }
    }
}

export function writeDB() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbCacheFile, buffer);
}

export function createTable(table: Table) {
    db.run(`CREATE TABLE ${table.name} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${table.columns.map((c) => [c, "int"].join(' '))})`);
    table.values?.forEach((row) => {
        db.run(`INSERT INTO table1 (${table.columns.join(',')}) VALUES (${row.join(", ")})`);
    });

    knownTables.set(table.name, table.columns);
}

export function discoverTables(db: Database, tableNames: string[]) {
    for (let tableName of tableNames) {
        const columns = db.exec(`PRAGMA table_info(${tableName})`)[0].values.map((cref) => cref[1] as string);
        columns.shift();
        knownTables.set(tableName, columns);
    }
}
