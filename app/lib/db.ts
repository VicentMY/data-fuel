import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "data_fuel",
  user: "postgres",
  password: "12344321",
});

export default pool;
