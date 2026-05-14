const { parentPort, workerData } = require('worker_threads');
const { Pool } = require('pg');

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "data_fuel",
  user: "postgres",
  password: "12344321",
});

const URL_BASE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/";

async function processDates() {
  const { dates } = workerData;
  const client = await pool.connect();
  
  try {
    for (const dateStr of dates) {
      const idcca = "10"; // As in the original script
      const url = `${URL_BASE}EstacionesTerrestresHist/FiltroCCAA/${dateStr}/${idcca}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.ListaEESSPrecio || data.ListaEESSPrecio.length === 0) {
        parentPort.postMessage(`No data for ${dateStr}`);
        continue;
      }

      // Parse date: "10/05/2026 00:00:00" -> Date object
      const [dPart, tPart] = data.Fecha.split(" ");
      const [day, month, year] = dPart.split("/");
      const [h, m, s] = tPart.split(":");
      const fechaTs = new Date(year, month - 1, day, h, m, s);

      for (const estacion of data.ListaEESSPrecio) {
        const idString = `${estacion.IDEESS}_${year}-${month}-${day}`;
        
        await client.query(`
          INSERT INTO estaciones_historico (id, id_gasolinera, nombre, direccion, localidad, provincia, cp, id_municipio, id_provincia, id_ccaa, horario, lat, lon, precio_g95, precio_g98, precio_diesel, precio_diesel_plus, precio_glp, actualizado)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO NOTHING
        `, [
          idString,
          estacion.IDEESS,
          estacion['Rótulo'],
          estacion['Dirección'],
          estacion.Localidad,
          estacion.Provincia,
          estacion['C.P.'],
          estacion.IDMunicipio,
          estacion.IDProvincia,
          estacion.IDCCAA,
          estacion.Horario,
          parseFloat(estacion.Latitud.replace(",", ".")),
          parseFloat(estacion['Longitud (WGS84)'].replace(",", ".")),
          parsePrice(estacion['Precio Gasolina 95 E5']),
          parsePrice(estacion['Precio Gasolina 98 E5']),
          parsePrice(estacion['Precio Gasoleo A']),
          parsePrice(estacion['Precio Gasoleo Premium']),
          parsePrice(estacion['Precio Gases licuados del petróleo']),
          fechaTs
        ]);
      }
      parentPort.postMessage(`Completed ${dateStr}`);
    }
  } catch (error) {
    parentPort.postMessage(`Error: ${error.message}`);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function parsePrice(price) {
  if (!price || price === "") return null;
  return parseFloat(price.replace(",", "."));
}

processDates().catch(err => {
  console.error(err);
  process.exit(1);
});
