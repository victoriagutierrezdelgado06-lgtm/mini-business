// ===============================
// CARGA Y PARSEO DEL CSV
// ===============================
fetch("ventas_raw.csv")
  .then(response => response.text())
  .then(text => init(text));

function init(csvText) {
  const rawData = parseCSV(csvText);
  document.getElementById("rawCount").textContent = rawData.length;

  renderTable(rawData.slice(0, 10), "rawTable");

  const cleanData = cleanRows(rawData);
  document.getElementById("cleanCount").textContent = cleanData.length;

  renderTable(cleanData.slice(0, 10), "cleanTable");

  calculateKPIs(cleanData);
  buildCharts(cleanData);
  enableDownload(cleanData);
}

// ===============================
// FUNCIONES DE PARSEO
// ===============================
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const values = line.split(",");
    let row = {};
    headers.forEach((h, i) => {
      row[h.trim()] = values[i]?.trim();
    });
    return row;
  });
}

// ===============================
// LIMPIEZA DE DATOS
// ===============================
function cleanRows(data) {
  const validFranjas = ["Desayuno", "Comida"];
  const validFamilias = ["Bebida", "Entrante", "Principal", "Postre"];
  const seen = new Set();

  return data
    .map(r => {
      // Fecha válida
      const date = new Date(r.fecha);
      if (isNaN(date)) return null;
      r.fecha = date.toISOString().split("T")[0];

      // Normalizar franja
      r.franja = capitalize(r.franja);
      if (!validFranjas.includes(r.franja)) return null;

      // Normalizar familia
      r.familia = capitalize(r.familia);
      if (!validFamilias.includes(r.familia)) return null;

      // Producto
      if (!r.producto) return null;
      r.producto = normalizeText(r.producto);

      // Números
      r.unidades = Number(r.unidades);
      r.precio_unitario = Number(r.precio_unitario);
      if (r.unidades <= 0 || r.precio_unitario <= 0) return null;

      // Recalcular importe
      r.importe = r.unidades * r.precio_unitario;

      return r;
    })
    .filter(r => {
      if (!r) return false;

      // Eliminar duplicados exactos
      const key = JSON.stringify(r);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ===============================
// KPIs
// ===============================
function calculateKPIs(data) {
  const ventas = data.reduce((s, r) => s + r.importe, 0);
  const unidades = data.reduce((s, r) => s + r.unidades, 0);

  document.getElementById("kpiVentas").textContent = ventas.toFixed(2);
  document.getElementById("kpiUnidades").textContent = unidades;
}

// ===============================
// GRÁFICOS
// ===============================
function buildCharts(data) {
  const byProducto = groupSum(data, "producto");
  const byFranja = groupSum(data, "franja");
  const byFamilia = groupSum(data, "familia");

  const top5 = Object.entries(byProducto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Lista Top 5
  const ul = document.getElementById("topProductos");
  top5.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p[0]} – €${p[1].toFixed(2)}`;
    ul.appendChild(li);
  });

  new Chart(document.getElementById("chartTopProductos"), {
    type: "bar",
    data: {
      labels: top5.map(p => p[0]),
      datasets: [{ data: top5.map(p => p[1]) }]
    }
  });

  new Chart(document.getElementById("chartFranja"), {
    type: "pie",
    data: {
      labels: Object.keys(byFranja),
      datasets: [{ data: Object.values(byFranja) }]
    }
  });

  new Chart(document.getElementById("chartFamilia"), {
    type: "pie",
    data: {
      labels: Object.keys(byFamilia),
      datasets: [{ data: Object.values(byFamilia) }]
    }
  });
}

// ===============================
// TABLAS
// ===============================
function renderTable(rows, tableId) {
  const table = document.getElementById(tableId);
  table.innerHTML = "";

  if (rows.length === 0) return;

  const header = document.createElement("tr");
  Object.keys(rows[0]).forEach(k => {
    const th = document.createElement("th");
    th.textContent = k;
    header.appendChild(th);
  });
  table.appendChild(header);

  rows.forEach(r => {
    const tr = document.createElement("tr");
    Object.values(r).forEach(v => {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}

// ===============================
// DESCARGA CSV LIMPIO
// ===============================
function enableDownload(data) {
  document.getElementById("downloadBtn").onclick = () => {
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(r => Object.values(r).join(","));
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ventas_clean.csv";
    a.click();
  };
}

// ===============================
// UTILIDADES
// ===============================
function groupSum(data, field) {
  return data.reduce((acc, r) => {
    acc[r[field]] = (acc[r[field]] || 0) + r.importe;
    return acc;
  }, {});
}

function normalizeText(text) {
  return text.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function capitalize(text) {
  if (!text) return "";
  return text.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
