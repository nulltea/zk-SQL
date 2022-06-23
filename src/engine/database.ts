import initSqlJs, {Database} from "sql.js";

type Table = {
    name: string,
    columns: string[],
    values: number[][]
}

export let db: Database;

export async function initDB(...tables: Table[]) {
    let SQL = await initSqlJs({
        locateFile: _ => `./node_modules/sql.js/dist/sql-wasm.wasm`
    });

    db = new SQL.Database();

    for (let table of tables) {
        db.run("CREATE TABLE table1 (id INTEGER PRIMARY KEY AUTOINCREMENT, f1 int, f2 int, f3 int, f4 int, f5 int)");
        table.values.forEach((row) => {
            db.run(`INSERT INTO table1 (${table.columns.join(',')}) VALUES (${row.join(", ")})`);
        });
    }
}
